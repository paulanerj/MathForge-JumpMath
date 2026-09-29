const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '} else {\n      // Re-load if playing a new level from config or cleared\n      engineRef.current.loadSchema(playlist[currentLevelIdx]);\n    }',
  '} else if (gameState === "playing") {\n      // Re-load if playing a new level from config or cleared\n      engineRef.current.loadSchema(playlist[currentLevelIdx]);\n    }'
);

code = code.replace(
  '    const handleClick = (e: MouseEvent) => {',
  '    engineRef.current.start();\n\n    const handleClick = (e: MouseEvent) => {'
);

fs.writeFileSync('src/App.tsx', code);
