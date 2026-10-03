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

/**
 * Розкодовує HTML-сутності (&quot;, &#039;, &amp; тощо) у звичайний текст
 */
function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/**
 * Перемішує елементи масиву за допомогою алгоритму Фішера-Єйтса
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Асинхронно завантажує питання з Open Trivia Database API
 * Використаний API: https://opentdb.com/api.php?amount=10&type=multiple
 */
async function loadData() {
    if (apiStatusMessage) {
        apiStatusMessage.textContent = 'Завантаження питань з сервера...';
        apiStatusMessage.className = 'result-message active info';
    }
    if (submitBtn) submitBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Помилка мережі: HTTP статус ${response.status} (${response.statusText})`);
        }

        const data = await response.json();
        console.log('[DevTools] Отримані дані від OpenTDB API:', data);

        if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
            throw new Error('API повернув некоректний код відповіді або порожній список питань');
        }

        quizQuestions = data.results.map((item, index) => {
            const decodedQuestion = decodeHTML(item.question);
            const decodedCorrect = decodeHTML(item.correct_answer);
            const decodedIncorrect = item.incorrect_answers.map(decodeHTML);
            const allOptions = shuffleArray([decodedCorrect, ...decodedIncorrect]);

            return {
                id: index + 1,
                question: decodedQuestion,
                options: allOptions,
                correctAnswer: decodedCorrect,
                userAnswer: ''
            };
        });

        currentQuestionIndex = 0;
        if (quizForm) quizForm.reset();
        renderCurrentQuestion();
        renderQuestions(quizQuestions);

        if (apiStatusMessage) {
            apiStatusMessage.textContent = '';
            apiStatusMessage.className = 'result-message';
        }
    } catch (error) {
        console.error('[API Error] Помилка завантаження даних:', error);

        if (apiStatusMessage) {
            apiStatusMessage.textContent = 'Не вдалося завантажити питання. Перевірте з\'єднання з інтернетом або спробуйте пізніше.';
            apiStatusMessage.className = 'result-message active error';
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

/**
 * Відображає поточне питання з масиву у формі HTML та оновлює елементи інтерфейсу
 */
function renderCurrentQuestion() {
    if (!quizQuestions || quizQuestions.length === 0) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    isAnswerSubmitted = false;

    if (nextBtn) {
        nextBtn.disabled = true;
    }

    if (questionTitle) {
        questionTitle.textContent = `Питання ${currentQuestionIndex + 1} з ${quizQuestions.length}`;
    }
    if (questionText) {
        questionText.textContent = currentQuestion.question;
    }
    if (progressFill) {
        const progressPercent = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
        progressFill.style.width = `${progressPercent}%`;
    }

    currentQuestion.options.forEach((optionText, index) => {
        const labelElement = document.querySelector(`label[for="option-${index}"]`);
        if (labelElement) {
            labelElement.textContent = optionText;
        }
    });

    if (resultMessage) {
        resultMessage.className = 'result-message';
        resultMessage.textContent = '';
    }
}

/**
 * Обробник події 'click' на кнопці "Оновити питання" для повторного запиту
 */
if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
        loadData();
    });
}

/**
 * Обробник події 'change' на радіокнопках для валідації вибраного варіанта
 */
const radioInputs = quizForm ? quizForm.querySelectorAll('input[name="answer"]') : [];
radioInputs.forEach((radioInput) => {
    radioInput.addEventListener('change', function() {
        radioInputs.forEach((r) => r.setCustomValidity(''));
        console.log(`[Change Event] Обрано варіант value="${this.value}". Стан валідації оновлено.`);
    });
});

/**
 * Обробник події 'submit' форми для перевірки відповіді та виведення результату
 */
if (quizForm) {
    quizForm.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!quizQuestions || quizQuestions.length === 0) return;

        const selectedValue = quizForm.elements['answer'].value;
        const chosenIndex = Number(selectedValue);

        const currentQuestion = quizQuestions[currentQuestionIndex];
        const correctIndex = currentQuestion.options.indexOf(currentQuestion.correctAnswer);

        const isCorrect = (chosenIndex === correctIndex);
        const selectedAnswerText = currentQuestion.options[chosenIndex];

        currentQuestion.userAnswer = selectedAnswerText;
        isAnswerSubmitted = true;

        if (nextBtn) {
            nextBtn.disabled = false;
        }

        if (resultMessage) {
            if (isCorrect) {
                resultMessage.textContent = `Правильно! "${selectedAnswerText}" — це вірна відповідь.`;
                resultMessage.className = 'result-message active success';
            } else {
                resultMessage.textContent = `Неправильно. Ви обрали "${selectedAnswerText}", а правильна відповідь: "${currentQuestion.correctAnswer}".`;
                resultMessage.className = 'result-message active error';
            }
        }

        console.log(`[Submit] Питання #${currentQuestionIndex + 1}: chosenIndex=${chosenIndex}, correctIndex=${correctIndex}. Результат: ${isCorrect ? 'Правильно' : 'Помилка'}`);
    });
}

/**
 * Обробник події 'click' на кнопці "Наступне питання"
 */
if (nextBtn) {
    nextBtn.addEventListener('click', function() {
        if (!isAnswerSubmitted) {
            return;
        }

        quizForm.reset();
        currentQuestionIndex = (currentQuestionIndex + 1) % quizQuestions.length;
        renderCurrentQuestion();

        console.log(`[Next Button] Переключено на питання #${currentQuestionIndex + 1}. Стан форми очищено.`);
    });
}

/**
 * Функція рендеру списку питань для сумісності з попередніми частинами практикуму
 * @param {Array} questionsArray 
 */
function renderQuestions(questionsArray) {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    questionsArray.forEach((questionData) => {
        const listItem = document.createElement('li');
        listItem.textContent = questionData.question;
        listItem.classList.add('варіант');
        listItem.dataset.answer = questionData.correctAnswer;
        if (questionData.userAnswer !== "") {
            listItem.classList.add('answered');
        }
        listContainer.append(listItem);
    });

    const countElement = document.querySelector('#questions-count');
    if (countElement) {
        countElement.textContent = `Загальна кількість питань: ${questionsArray.length}`;
    }
}

// Початковий виклик асинхронного завантаження питань при відкритті сторінки
loadData();
