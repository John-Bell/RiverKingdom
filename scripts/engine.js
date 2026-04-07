window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // Initialization phase
        if (parsedData.action === "init") {
            // Hardcode the required orders for Season 1 on boot
            parsedData.state.requestedOrders = ["dykeWorkers", "fieldWorkers", "villageGuards", "riceToPlant"];
            
            const stateString = encodeURIComponent(JSON.stringify(parsedData.state));
            const systemStateString = JSON.stringify(parsedData.state);
            
            return JSON.stringify({
                result: `The Kingdom is established. Awaiting the Emperor's first command.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                webview: {
                    url: `webview.html?state=${stateString}`,
                    aspectRatio: 1.333
                }
            });
        }

        // Normal turn processing
        const nextTurn = processSeason(parsedData.state, parsedData.orders);
        
        const stateString = encodeURIComponent(JSON.stringify(nextTurn.state));
        const systemStateString = JSON.stringify(nextTurn.state);

        return JSON.stringify({
            result: nextTurn.turnReport + `\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
            webview: {
                url: `webview.html?state=${stateString}`,
                aspectRatio: 1.333
            }
        });
    } catch (e) {
        return JSON.stringify({ error: e.message || e.toString() });
    }
};
