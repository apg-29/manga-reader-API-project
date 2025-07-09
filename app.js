import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const app = express();

// Required workaround to use __dirname with ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});



