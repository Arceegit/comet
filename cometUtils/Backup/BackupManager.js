const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class BackupManager {
    constructor(client) {
        this.client = client;
        this.backupInterval = null;
        this.cleanupInterval = null;
        this.projectRoot = path.join(__dirname, '..', '..'); 
        this.backupDir = path.join(this.projectRoot, 'backups');
        this.isInitialized = false; 
        this.currentConfig = {}; 

        this.filesToBackup = this.client.config.getRtconfig().comet.backup.filesToBackup || [];

        this.client.config.addRtconfigChangeCallback(this._handleRuntimeConfigChange.bind(this));
    }

    _handleRuntimeConfigChange(newRuntimeConfig) {
        const oldConfig = { ...this.currentConfig }; 

        this.currentConfig = newRuntimeConfig.comet.backup;

        const newConfig = this.currentConfig; 

        const enabledChanged = oldConfig.enabled !== newConfig.enabled;
        const intervalChanged = oldConfig.intervalHours !== newConfig.intervalHours;
        const deleteEnabledChanged = oldConfig.deleteOldBackups?.enabled !== newConfig.deleteOldBackups?.enabled;
        const maxAgeChanged = oldConfig.deleteOldBackups?.maxAgeHours !== newConfig.deleteOldBackups?.maxAgeHours;

        const configChanged = enabledChanged || intervalChanged || deleteEnabledChanged || maxAgeChanged;

        if (configChanged) {
            this.client.logs.info('BACKUP » Backup Manager configuration changed. Re-initializing...');
            this.stop(); 
            this.initialize(false); 
        }
    }

    async initialize(triggerStartupBackup = true) {
        if (this.isInitialized && triggerStartupBackup) {
            return;
        }

        this.currentConfig = this.client.config.getRtconfig().comet.backup; 

        if (!this.currentConfig.enabled) {
            this.client.logs.warn('BACKUP » Backup system is disabled in rtconfig.json.');
            this.stop(); 
            this.isInitialized = true;
            return;
        }

        try {
            await fs.ensureDir(this.backupDir);
            this.client.logs.success('BACKUP » Backup directory ensured.');

            if (triggerStartupBackup && this.currentConfig.backupOnStartup) {
                this.client.logs.info('BACKUP » Creating initial backup on startup...');
                await this.createBackup();
            }

            this.scheduleBackups();
            if (this.currentConfig.deleteOldBackups.enabled) {
                this.scheduleCleanup();
            } else {
                if (this.cleanupInterval) clearInterval(this.cleanupInterval);
            }
            this.isInitialized = true;
        } catch (error) {
            this.client.logs.error(`BACKUP » Failed to initialize backup system: ${error.message}`);
            this.isInitialized = false;
        }
    }

    scheduleBackups() {
        const intervalHours = this.currentConfig.intervalHours || 24;
        if (this.backupInterval) clearInterval(this.backupInterval);
        this.backupInterval = setInterval(() => this.createBackup(), intervalHours * 60 * 60 * 1000);
        this.client.logs.info(`BACKUP » Scheduled to create backups every ${intervalHours} hour(s).`);
    }

    scheduleCleanup() {
        const maxAgeHours = this.currentConfig.deleteOldBackups.maxAgeHours || 72;
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        this.cleanupInterval = setInterval(() => this.cleanupOldBackups(), 60 * 60 * 1000); 
        this.client.logs.info(`BACKUP » Scheduled to clean up backups older than ${maxAgeHours} hour(s).`);
    }

    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `comet_backup-${timestamp}.zip`;
        const backupFilePath = path.join(this.backupDir, backupFileName);

        this.client.logs.info('BACKUP » Starting new backup creation...');

        try {
            const output = fs.createWriteStream(backupFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                this.client.logs.success(`BACKUP » Backup created successfully: ${backupFileName}`);
            });

            output.on('end', () => {
                this.client.logs.debug('BACKUP » Data has been drained from archive.');
            });

            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    this.client.logs.warn(`BACKUP » Archiver warning: ${err.message}`);
                } else {
                    this.client.logs.error(`BACKUP » Archiver error: ${err.message}`);
                }
            });

            archive.on('error', (err) => {
                throw err; 
            });

            archive.pipe(output);

            for (const item of this.filesToBackup) {
                const itemPath = path.join(this.projectRoot, item);
                const stats = await fs.stat(itemPath).catch(() => null); 

                if (stats) {
                    if (stats.isDirectory()) {
                        archive.directory(itemPath, item); 
                        this.client.logs.debug(`BACKUP » Added directory to backup: ${item}`);
                    } else if (stats.isFile()) {
                        archive.file(itemPath, { name: item }); 
                        this.client.logs.debug(`BACKUP » Added file to backup: ${item}`);
                    }
                } else {
                    this.client.logs.warn(`BACKUP » Skipped missing item during backup: ${item}`);
                }
            }

            await archive.finalize();
        } catch (error) {
            this.client.logs.error(`BACKUP » Failed to create backup: ${error.message}`);
            if (fs.existsSync(backupFilePath)) {
                await fs.remove(backupFilePath).catch(e => this.client.logs.error(`BACKUP » Failed to clean up incomplete backup: ${e.message}`));
            }
        }
    }

    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const now = Date.now();
            const maxAgeMs = (this.currentConfig.deleteOldBackups.maxAgeHours || 72) * 60 * 60 * 1000;
            let cleanedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtime.getTime() > maxAgeMs) {
                    await fs.remove(filePath);
                    this.client.logs.info(`BACKUP » Deleted old backup: ${file}`);
                    cleanedCount++;
                }
            }
            if (cleanedCount > 0) {
                this.client.logs.success(`BACKUP » Cleaned up ${cleanedCount} old backup(s).`);
            } else {
                this.client.logs.debug('BACKUP » No old backups to clean up.');
            }
        } catch (error) {
            this.client.logs.error(`BACKUP » Failed to clean up old backups: ${error.message}`);
        }
    }

    stop() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.client.logs.info('BACKUP » Backup system stopped.');
    }
}

module.exports = BackupManager;