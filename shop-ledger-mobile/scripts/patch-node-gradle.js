const fs = require('fs');
const path = require('path');

const filesToPatch = [
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo-constants', 'scripts', 'get-app-config-android.gradle'),
    needle: 'commandLine("node",',
    replace: `def findNodeCmd() {\n  for (path in ["/opt/homebrew/bin/node", "/usr/local/bin/node", System.getenv("NODE_BINARY")]) {\n    if (path && new File(path).exists()) return path\n  }\n  return "node"\n}\ndef nodeCmd = findNodeCmd()\ncommandLine(nodeCmd,`
  },
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo-modules-core', 'android', 'build.gradle'),
    needle: 'commandLine("node",',
    replace: `def findNodeCmd() {\n  for (path in ["/opt/homebrew/bin/node", "/usr/local/bin/node", System.getenv("NODE_BINARY")]) {\n    if (path && new File(path).exists()) return path\n  }\n  return "node"\n}\ndef nodeCmd = findNodeCmd()\ncommandLine(nodeCmd,`
  },
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo', 'android', 'build.gradle'),
    needle: 'commandLine("node",',
    replace: `def findNodeCmd() {\n  for (path in ["/opt/homebrew/bin/node", "/usr/local/bin/node", System.getenv("NODE_BINARY")]) {\n    if (path && new File(path).exists()) return path\n  }\n  return "node"\n}\ndef nodeCmd = findNodeCmd()\ncommandLine(nodeCmd,`
  }
];

filesToPatch.forEach(({ filePath, needle, replace }) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(needle)) {
      content = content.replace(needle, replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Patch] Updated ${path.basename(filePath)} to use dynamic nodeCmd`);
    }
  }
});
