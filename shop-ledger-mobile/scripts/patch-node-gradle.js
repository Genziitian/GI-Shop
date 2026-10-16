const fs = require('fs');
const path = require('path');

const nodeFinderSnippet = `def nodeCmd = ["/opt/homebrew/bin/node", "/usr/local/bin/node", System.getProperty("user.home") + "/.gemini/antigravity/bin/node", System.getenv("NODE_BINARY")].find { it && new File(it).exists() } ?: "node"\ncommandLine(nodeCmd,`;

const filesToPatch = [
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo-constants', 'scripts', 'get-app-config-android.gradle'),
    needle: 'commandLine("node",',
    replace: nodeFinderSnippet
  },
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo-modules-core', 'android', 'build.gradle'),
    needle: 'commandLine("node",',
    replace: nodeFinderSnippet
  },
  {
    filePath: path.join(__dirname, '..', 'node_modules', 'expo', 'android', 'build.gradle'),
    needle: 'commandLine("node",',
    replace: nodeFinderSnippet
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
