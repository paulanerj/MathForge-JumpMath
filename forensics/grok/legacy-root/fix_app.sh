sed -i 's/} else {/} else if (gameState === '"'playing'") {/' src/App.tsx
sed -i '/const handleClick = (e: MouseEvent) => {/i\
    engineRef.current.start();\
' src/App.tsx
