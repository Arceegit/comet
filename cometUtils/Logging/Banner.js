const ColorManager = require('./ColorManager');

module.exports = {
  getStartupBanner: (version = "B1") => {
    const c = ColorManager.colors;
    const bannerText = `
${c.background}   ██████╗ ██████╗ ███╗   ███╗███████╗████████╗${c.reset}
${c.foreground}  ██╔════╝██╔═══██╗████╗ ████║██╔════╝╚══██╔══╝${c.reset}
${c.background}  ██║     ██║   ██║██╔████╔██║█████╗     ██║   ${c.reset}
${c.foreground}  ██║     ██║   ██║██║╚██╔╝██║██╔══╝     ██║   ${c.reset}
${c.background}  ╚██████╗╚██████╔╝██║ ╚═╝ ██║███████╗   ██║   ${c.reset}
${c.foreground}   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝   ╚═╝   ${c.reset}
`;

    const author = "By Logical Impulse (arcee)";
    const ver = `Version: ${version}`;
    const line = c.comment + "═".repeat(55) + c.reset;

    return `
${line}
${bannerText}
${line}
  ${c.comment}${author.padStart(53)}${c.reset}
  ${c.comment}${ver.padStart(53)}${c.reset}
${line}
`;
  },
  
  getProgressBar: (current, total, width = 30) => {
    const c = ColorManager.colors;
    const percentage = Math.floor((current / total) * 100);
    const filledWidth = Math.floor((current / total) * width);
    const emptyWidth = width - filledWidth;
    
    const filled = c.green + '█'.repeat(filledWidth) + c.reset;
    const empty = c.comment + '░'.repeat(emptyWidth) + c.reset;
    
    return `[${filled}${empty}] ${c.foreground}${percentage}%${c.reset}`;
  }
};
