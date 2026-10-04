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

function QuizQuestion({ question, options, correctIndex, selectedIndex, isSubmitted, onAnswer }) {
    return (
        <div className="quiz-question-box">
            <p id="question-text">{question}</p>

            <fieldset className="options-group">
                <legend className="sr-only">Варіанти відповідей</legend>

                {options && options.map((optionText, index) => {
                    let optionClass = "option-item";

                    if (isSubmitted) {
                        if (index === correctIndex) {
                            optionClass += " correct-option";
                        } else if (index === selectedIndex && index !== correctIndex) {
                            optionClass += " incorrect-option";
                        }
                    }

                    return (
                        <div className={optionClass} key={index}>
                            <input
                                type="radio"
                                id={`option-${index}`}
                                name="quiz-answer"
                                value={index}
                                checked={selectedIndex === index}
                                disabled={isSubmitted}
                                onChange={() => onAnswer(index)}
                            />
                            <label htmlFor={`option-${index}`}>
                                {optionText}
                            </label>
                        </div>
                    );
                })}
            </fieldset>
        </div>
    );
}

function App() {
    const [questions, setQuestions] = React.useState([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [score, setScore] = React.useState(0);
    const [selectedIndex, setSelectedIndex] = React.useState(null);
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [resultFeedback, setResultFeedback] = React.useState(null);
    const [isQuizFinished, setIsQuizFinished] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const [history, setHistory] = React.useState([
        { id: 1, date: '10.09.2026', score: 8, total: 10 },
        { id: 2, date: '8.09.2026', score: 7, total: 10 },
        { id: 3, date: '5.09.2026', score: 9, total: 10 }
    ]);

    const fetchQuestions = async () => {
        setIsLoading(true);
        setError(null);
        setIsQuizFinished(false);
        try {
            const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
            if (!response.ok) {
                throw new Error(`HTTP помилка: ${response.status}`);
            }
            const data = await response.json();

            if (data.response_code !== 0 || !Array.isArray(data.results)) {
                throw new Error('API повернув порожній список питань');
            }

            const formattedQuestions = data.results.map((item, index) => {
                const decodedQuestion = decodeHTML(item.question);
                const decodedCorrect = decodeHTML(item.correct_answer);
                const decodedIncorrect = item.incorrect_answers.map(decodeHTML);
                const allOptions = shuffleArray([decodedCorrect, ...decodedIncorrect]);
                const correctIndex = allOptions.indexOf(decodedCorrect);

                return {
                    id: index + 1,
                    question: decodedQuestion,
                    options: allOptions,
                    correctAnswer: decodedCorrect,
                    correctIndex: correctIndex
                };
            });

            setQuestions(formattedQuestions);
            setCurrentIndex(0);
            setScore(0);
            setSelectedIndex(null);
            setIsSubmitted(false);
            setResultFeedback(null);
        } catch (err) {
            console.error('[API Error]', err);
            setError('Не вдалося завантажити питання. Перевірте підключення до мережі.');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchQuestions();
    }, []);

    const handleAnswerSelect = (index) => {
        if (!isSubmitted) {
            setSelectedIndex(index);
        }
    };

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        if (selectedIndex === null || isSubmitted) return;

        const currentQ = questions[currentIndex];
        const isCorrect = selectedIndex === currentQ.correctIndex;

        setIsSubmitted(true);

        if (isCorrect) {
            setScore((prevScore) => prevScore + 1);
            setResultFeedback({
                type: 'success',
                message: `Правильно! "${currentQ.options[selectedIndex]}" — це вірна відповідь.`
            });
        } else {
            setResultFeedback({
                type: 'error',
                message: `Неправильно. Ви обрали "${currentQ.options[selectedIndex]}", а правильна відповідь: "${currentQ.correctAnswer}".`
            });
        }
    };

    const handleNextQuestion = () => {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prevIndex) => prevIndex + 1);
            setSelectedIndex(null);
            setIsSubmitted(false);
            setResultFeedback(null);
        } else {
            setIsQuizFinished(true);
            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            setHistory((prevHistory) => [
                { id: Date.now(), date: dateStr, score: score, total: questions.length },
                ...prevHistory
            ]);
        }
    };

    const currentQ = questions[currentIndex];

    return (
        <div>
            <section id="поточне_питання">
                {isLoading && <div className="result-message active info">Завантаження питань з сервера...</div>}
                {error && <div className="result-message active error">{error}</div>}

                {!isLoading && !error && isQuizFinished && (
                    <div style={{ textAlign: 'center' }}>
                        <h2>Вікторину завершено! 🏆</h2>
                        <p style={{ fontSize: '1.3rem' }}>
                            Ваш підсумковий результат: <strong>{score} з {questions.length}</strong> правильних відповідей.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={fetchQuestions}>
                            Пройти ще раз
                        </button>
                    </div>
                )}

                {!isLoading && !error && !isQuizFinished && currentQ && (
                    <form onSubmit={handleSubmitAnswer}>
                        <div className="quiz-progress-header">
                            <h2 className="question-number" id="question-title">
                                Питання {currentIndex + 1} з {questions.length}
                            </h2>
                            <div className="progress-bar-track">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <QuizQuestion
                            question={currentQ.question}
                            options={currentQ.options}
                            correctIndex={currentQ.correctIndex}
                            selectedIndex={selectedIndex}
                            isSubmitted={isSubmitted}
                            onAnswer={handleAnswerSelect}
                        />

                        {resultFeedback && (
                            <div className={`result-message active ${resultFeedback.type}`}>
                                {resultFeedback.message}
                            </div>
                        )}

                        <div className="form-actions">
                            {!isSubmitted ? (
                                <button
                                    type="submit"
                                    id="submit-btn"
                                    className="btn btn-primary"
                                    disabled={selectedIndex === null}
                                >
                                    Відповісти
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    id="next-btn"
                                    className="btn btn-primary"
                                    onClick={handleNextQuestion}
                                >
                                    {currentIndex + 1 < questions.length ? 'Наступне питання' : 'Переглянути результати'}
                                </button>
                            )}

                            <button
                                type="button"
                                id="refresh-btn"
                                className="btn btn-secondary"
                                onClick={fetchQuestions}
                            >
                                Оновити питання
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section id="історія_спроб">
                <h2>Історія спроб</h2>
                <div className="cards">
                    {history.map((item) => (
                        <article key={item.id}>
                            <h3>{item.date}, Результат {item.score}/{item.total}</h3>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
