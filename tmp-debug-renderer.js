const { WebSocket } = globalThis;

fetch('http://127.0.0.1:9222/json')
  .then(r => r.json())
  .then(t => {
    const ws = new WebSocket(t[0].webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const scripts = Array.from(document.scripts).map(s => s.src || s.src);
            const errEl = document.getElementById('renderer-error');
            return {
              scripts,
              rendererErrorVisible: !!(errEl && !errEl.classList.contains('hidden')),
              rendererErrorText: errEl ? (errEl.innerText||'').slice(0,1000) : null,
              title: document.title,
              bodyText: (document.body.innerText||'').slice(0,200)
            };
          })()` ,
          returnByValue: true,
        },
      }));
    };

    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id === 2) {
        console.log('RESULT', JSON.stringify(m.result.result, null, 2));
        ws.close();
        process.exit(0);
      }
    };

    ws.onerror = e => {
      console.error('WSERR', e);
      process.exit(1);
    };
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
