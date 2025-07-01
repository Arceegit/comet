const path = require('node:path');
const fs = require('node:fs');

const resolvedModules = new Map();

const projectRoot = path.join(__dirname, '..', '..');

function connect(moduleIdentifier, aliases = {}) {
    let finalIdentifier = moduleIdentifier;

    if (aliases[moduleIdentifier]) {
        finalIdentifier = aliases[moduleIdentifier];
    }

    if (resolvedModules.has(finalIdentifier)) {
        return resolvedModules.get(finalIdentifier);
    }

    let resolvedModule = null;
    let modulePathAttempted = finalIdentifier; 

    try {
        resolvedModule = require(modulePathAttempted);
    } catch (e1) {
        modulePathAttempted = path.join(projectRoot, finalIdentifier);
        try {
            resolvedModule = require(modulePathAttempted);
        } catch (e2) {
            throw new Error(
                `Cannot find module '${moduleIdentifier}'. ` +
                `Tried: '${finalIdentifier}' (direct require) and '${modulePathAttempted}' (relative to project root). ` +
                `Original error: ${e1.message}` 
            );
        }
    }

    if (resolvedModule) {
        resolvedModules.set(finalIdentifier, resolvedModule);
        return resolvedModule;
    } else {
        throw new Error(`Unexpected error: Module '${moduleIdentifier}' could not be resolved.`);
    }
}

module.exports = connect;