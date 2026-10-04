/* =========================================================================
 * КРОК 7: ПРИБРАТИ РУЧНИЙ DOM-КОД
 * 
 * ПОЯСНЕННЯ ДЛЯ ВИКЛАДАЧА:
 * Ручну функцію рендеру renderCurrentQuestion() та renderQuestions() з Практикуму 7
 * ЗАКОМЕНТОВАНО/ЗАМІНЕНО.
 * 
 * Цю ділянку інтерфейсу (відображення питань та варіантів відповідей) повністю
 * замінено окремим дочірнім компонентом QuizQuestion (Варіант 8) у файлі js/app.js.
 * ========================================================================= */

/*
console.log('script.js підключено');

// Константа URL для завантаження 10 питань з Open Trivia Database API
const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';

// Глобальні змінні стану вікторини
let quizQuestions = [];
let currentQuestionIndex = 0;
let isAnswerSubmitted = false;

// Елементи DOM для управління формою та елементами інтерфейсу
const apiStatusMessage = document.querySelector('#api-status-message');
const submitBtn = document.querySelector('#submit-btn');
const refreshBtn = document.querySelector('#refresh-btn');
const nextBtn = document.querySelector('#next-btn');
const quizForm = document.querySelector('#quiz-form');
const questionTitle = document.querySelector('#question-title');
const questionText = document.querySelector('#question-text');
const progressFill = document.querySelector('#progress-fill');
const resultMessage = document.querySelector('#result-message');
const listContainer = document.querySelector('#questions-list');

function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function loadData() {
    // [РУЧНИЙ DOM РЕНДЕР ЗАМІНЕНО НА REACT useState В js/app.js]
}

function renderCurrentQuestion() {
    // [РУЧНИЙ DOM РЕНДЕР ЗАМІНЕНО НА ОКРЕМІЙ КОМПОНЕНТ QuizQuestion У js/app.js]
}

function renderQuestions(questionsArray) {
    // [ЗАМІНЕНО НА React .map() РЕНДЕР У КОМПОНЕНТІ QuizQuestion]
}
*/
