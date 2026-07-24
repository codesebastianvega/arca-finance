const data = JSON.stringify({
  messages: [
    { role: 'user', content: 'crea u gasto de 18 mil para marihuana' }
  ],
  novaPreferences: { autonomy: 'guide', tone: 'brief' }
});

fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: data
})
.then(async (res) => {
  console.log(`STATUS: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf8');
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) {
      console.log(`BODY: ${decoder.decode(value)}`);
    }
    done = readerDone;
  }
  console.log('No more data in response.');
})
.catch(console.error);
