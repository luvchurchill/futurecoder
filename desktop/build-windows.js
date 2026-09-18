const {spawnSync} = require('node:child_process');

// Every normal Windows build includes both supported editions. Publication is
// handled only by CI after both packaged applications pass validation.
for (const config of ['electron-builder.config.cjs', 'electron-builder.win7.cjs']) {
  const result = spawnSync(process.execPath, [
    require.resolve('electron-builder/cli.js'), '--config', config,
    '--win', '--publish', 'never',
  ], {cwd: __dirname, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
