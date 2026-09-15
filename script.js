console.log('script.js підключено');

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
