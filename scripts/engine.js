window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // --- 1. COMBINED LOAD / AUTO-INIT ---
        if (parsedData.action === "load") {
            const savedData = localStorage.getItem('riverKingdomSave');
            if (savedData) {
                const loadedState = JSON.parse(savedData);
                const stateString = encodeURIComponent(JSON.stringify(loadedState));

                return JSON.stringify({
                    result: `I found the records of your village, my Prince. We are in Year ${loadedState.year}, Season ${loadedState.season}. The village awaits your brilliant commands.\n\nDATA FOR VIZIER:\nYear: ${loadedState.year} | Season: ${loadedState.season} | Population: ${loadedState.population} | Stored Rice: ${loadedState.storedRice}\nAvailable Actions: ${loadedState.availableActions}`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 0.56 }
                });
            } else {
                const initState = {
                    year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                    availableActions: "Roles available: dyke workers, field workers, village guards, and sacks of rice to plant."
                };
                localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
                const stateString = encodeURIComponent(JSON.stringify(initState));
                
                return JSON.stringify({
                    result: `Your father, the Emperor, has entrusted you with a new village. I am eager to witness your strategic genius, my Prince.\n\nDATA FOR VIZIER:\nYear: 1 | Season: 1 | Population: 100 | Stored Rice: 1200\nAvailable Actions: Roles available: dyke workers, field workers, village guards, and sacks of rice to plant.`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 0.56 }
                });
            }
        }

        // --- 2. EXPLICIT NEW GAME ---
        if (parsedData.action === "init") {
            const initState = {
                year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                availableActions: "Roles available: dyke workers, field workers, village guards, and sacks of rice to plant."
            };
            localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
            const stateString = encodeURIComponent(JSON.stringify(initState));
            
            return JSON.stringify({
                result: `A fresh village has been established for you by the Emperor. I await your flawless leadership.\n\nDATA FOR VIZIER:\nYear: 1 | Season: 1 | Population: 100 | Stored Rice: 1200\nAvailable Actions: Roles available: dyke workers, field workers, village guards, and sacks of rice to plant.`,
                webview: { url: `webview.html?state=${stateString}`, aspectRatio: 0.56 }
            });
        }

        // --- 3. NORMAL TURN PROCESSING ---
        const savedData = localStorage.getItem('riverKingdomSave');
        const currentState = savedData ? JSON.parse(savedData) : {};
        const combinedData = { ...currentState, ...parsedData };
        const nextTurn = processSeason(combinedData);
        
        if (!nextTurn.turnReport.includes("INVALID ORDERS")) {
            if (nextTurn.nextStateForLLM.gameOver) {
                localStorage.removeItem('riverKingdomSave');
            } else {
                localStorage.setItem('riverKingdomSave', JSON.stringify(nextTurn.nextStateForLLM));
            }
        }

        // Detect animations for the URL
        let animParam = "";
        if (nextTurn.nextStateForLLM.floodIntensity > 0) animParam = `&anim=flood&intensity=${nextTurn.nextStateForLLM.floodIntensity}`;
        if (nextTurn.nextStateForLLM.hasThieves) animParam = `&anim=raid`;

        const stateString = encodeURIComponent(JSON.stringify(nextTurn.stateForUI));

        // Delay to allow the webview animation to play out in the chat bubble
        await new Promise(resolve => setTimeout(resolve, 4500));

        return JSON.stringify({
            result: `${nextTurn.turnReport}\n\nDATA FOR VIZIER:\nYear: ${nextTurn.nextStateForLLM.year} | Season: ${nextTurn.nextStateForLLM.season} | Population: ${nextTurn.nextStateForLLM.population} | Stored Rice: ${nextTurn.nextStateForLLM.storedRice}\nAvailable Actions: ${nextTurn.nextStateForLLM.availableActions}`,
            webview: {
                url: `webview.html?state=${stateString}${animParam}`,
                aspectRatio: 0.56
            }
        });

    } catch (e) {
        return JSON.stringify({ error: e.message || e.toString() });
    }
};
