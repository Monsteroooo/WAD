/* =========================================================================
 * КРОК 7: ПРИБРАТИ РУЧНИЙ DOM-КОД
 * 
 * Ручний DOM-код та функції рендеру з Практикуму 7/9 (renderCurrentQuestion,
 * renderQuestions, loadData) замінено на декларативний фреймворк React.
 * Цю ділянку інтерфейсу повністю винесено в окремий компонент QuizQuestion
 * та головний компонент App у файлі js/app.js.
 * ========================================================================= */

async function loadData() {
    // [РУЧНИЙ DOM РЕНДЕР ЗАМІНЕНО НА REACT useState В js/app.js]
}

function renderCurrentQuestion() {
    // [РУЧНИЙ DOM РЕНДЕР ЗАМІНЕНО НА ОКРЕМІЙ КОМПОНЕНТ QuizQuestion У js/app.js]
}

function renderQuestions(questionsArray) {
    // [ЗАМІНЕНО НА React .map() РЕНДЕР У КОМПОНЕНТІ QuizQuestion]
}
