const express = require('express');
const path = require('path');
const questions = require('./data/questions.json');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_DIR = path.resolve(__dirname, '..');

app.use(express.json());
app.use(express.static(CLIENT_DIR));

// Головна сторінка
app.get('/', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Отримання списку всіх питань
app.get('/api/questions', (req, res) => {
    res.json(questions);
});

// Отримання питання за ID
app.get('/api/questions/:id', (req, res) => {
    const questionId = Number(req.params.id);
    const foundQuestion = questions.find(q => q.id === questionId);

    if (!foundQuestion) {
        return res.status(404).json({
            error: `Питання з ID ${req.params.id} не знайдено`
        });
    }

    res.json(foundQuestion);
});

// Обробка неіснуючих маршрутів
app.use((req, res) => {
    res.status(404).json({
        error: 'Маршрут не знайдено',
        requestedPath: req.originalUrl
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер успішно запущено на http://localhost:${PORT}`);
    });
}

module.exports = app;
