const repository = (process.env.GITHUB_REPOSITORY || "alexmojaki/futurecoder").split("/");

module.exports = {
  appId: "io.futurecoder.offline",
  productName: "futurecoder Offline",
  asar: true,
  directories: {
    output: "release",
  },
  files: [
    "main.js",
    "server.js",
    "package.json",
  ],
  extraResources: [
    {from: "../frontend/course", to: "course"},
    {from: "../LICENSE.txt", to: "LICENSE.txt"},
    {from: "THIRD_PARTY_NOTICES.md", to: "THIRD_PARTY_NOTICES.md"},
  ],
  win: {
    icon: "../frontend/public/favicon.ico",
    target: [{target: "nsis-web", arch: ["x64"]}],
    artifactName: "futurecoder-Offline-Web-Setup-${version}-${arch}.${ext}",
    publish: {
      provider: "github",
      owner: repository[0],
      repo: repository[1],
    },
  },
  nsisWeb: {
    oneClick: true,
    perMachine: false,
    allowElevation: false,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    shortcutName: "futurecoder Offline",
    uninstallDisplayName: "futurecoder Offline",
    deleteAppDataOnUninstall: false,
  },
};
