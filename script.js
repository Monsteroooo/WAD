console.log('script.js підключено');

const quizQuestions = [
    {
        id: 1,
        question: "Яке місто є столицею України?",
        options: ["Київ", "Львів", "Одеса", "Харків"],
        correctAnswer: "Київ",
        userAnswer: ""
    },
    {
        id: 2,
        question: "Скільки планет у Сонячній системі?",
        options: ["7", "8", "9", "10"],
        correctAnswer: "8",
        userAnswer: ""
    },
    {
        id: 3,
        question: "Яка найбільша річка в Україні?",
        options: ["Дністер", "Десна", "Дніпро", "Південний Буг"],
        correctAnswer: "Дніпро",
        userAnswer: ""
    }
];

let currentQuestionIndex = 0;
let isAnswerSubmitted = false;

const quizForm = document.querySelector('#quiz-form');
const nextBtn = document.querySelector('#next-btn');
const questionTitle = document.querySelector('#question-title');
const questionText = document.querySelector('#question-text');
const progressFill = document.querySelector('#progress-fill');
const resultMessage = document.querySelector('#result-message');

/**
 * Відображає поточне питання з масиву у формі HTML та оновлює елементи інтерфейсу
 */
function renderCurrentQuestion() {
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

renderCurrentQuestion();

/**
 * Обробник події 'change' на радіокнопках для додаткової валідації полів
 */
const radioInputs = quizForm ? quizForm.querySelectorAll('input[name="answer"]') : [];

radioInputs.forEach((radioInput) => {
    radioInput.addEventListener('change', function() {
        radioInputs.forEach((r) => r.setCustomValidity(''));
        console.log(`[Change Event] Обрано варіант value="${this.value}". Стан валідації оновлено.`);
    });
});

/**
 * Обробник події 'submit' форми: скасовує перезавантаження, перевіряє обрану відповідь та відображає результат
 */
if (quizForm) {
    quizForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
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
 * Обробник події 'click' на кнопці "Наступне питання": скидає стан форми та завантажує наступне питання
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
 */
const listContainer = document.querySelector('#questions-list');
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

renderQuestions(quizQuestions);
