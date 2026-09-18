const base = require('./electron-builder.config.cjs');

// Electron 22 is the final runtime supporting Windows 7/8/8.1.
// Keep this separate from the maintained runtime used by the x64 edition.
module.exports = {
  ...base,
  electronVersion: '22.3.27',
  directories: {output: 'release/win7-ia32'},
  win: {
    ...base.win,
    target: [{target: 'nsis', arch: ['ia32']}],
    artifactName: 'futurecoder-Offline-Setup-${version}-win7-ia32.${ext}',
  },
  nsis: {...base.nsisWeb},
};
