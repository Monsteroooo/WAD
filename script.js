console.log('script.js підключено');

const staticExample = document.querySelector('#questions-list li');
if (staticExample) {
    staticExample.remove();
}


const quizQuestions = [
    {
        id: 1,
        question: "Яке місто є столицею України?",
        options: ["Київ", "Львів", "Одеса", "Харків"],
        correctAnswer: "Київ",
        userAnswer: "Київ"
    },
    {
        id: 2,
        question: "Скільки планет у Сонячній системі?",
        options: ["7", "8", "9", "10"],
        correctAnswer: "8",
        userAnswer: "9"
    },
    {
        id: 3,
        question: "Яка найбільша річка в Україні?",
        options: ["Дністер", "Десна", "Дніпро", "Південний Буг"],
        correctAnswer: "Дніпро",
        userAnswer: "Дніпро"
    }
];

const listContainer = document.querySelector('#questions-list');

/**
 * Функція для динамічного рендеру списку питань.
 * Проходить по переданому масиву даних, створює для кожного питання 
 * HTML-елемент <li> з відповідними атрибутами та класами,
 * після чого додає його у загальний контейнер на сторінці.
 */
function renderQuestions(questionsArray) {
    questionsArray.forEach((questionData) => {
        const listItem = document.createElement('li');
        listItem.textContent = questionData.question;
        
        // Додаємо клас .варіант для базової стилізації
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

// Функція перевіряє відповідь користувача та повертає результат (правильно чи помилка)
const checkAnswer = (userAnswer, correctAnswer) => {
    return userAnswer === correctAnswer ? "Правильно ✅" : "Помилка ❌";
};

// Функція обробляє масив питань через цикл for...of і виводить підсумкову інформацію в консоль
function analyzeQuizData(questions) {
    let totalQuestions = 0;
    let allCorrectAnswers = [];

    for (const item of questions) {
        totalQuestions++;
        allCorrectAnswers.push(item.correctAnswer);

        let result = checkAnswer(item.userAnswer, item.correctAnswer);
        console.log(`Питання ${item.id}: Ваша відповідь "${item.userAnswer}". Результат: ${result}`);
    }

    console.log(`--- Підсумок вікторини ---`);
    console.log(`Загальна кількість питань: ${totalQuestions}`);
    console.log(`Список усіх правильних відповідей: ${allCorrectAnswers.join(', ')}`);
}

analyzeQuizData(quizQuestions);
