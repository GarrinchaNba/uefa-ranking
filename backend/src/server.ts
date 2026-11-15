import { app } from './api/app.js';

const port = 3000;

app.listen(port, '127.0.0.1', () => {
  console.log(`Backend listening on http://127.0.0.1:${port}`);
});
