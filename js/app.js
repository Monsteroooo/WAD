/**
 * Створює об'єкт результату вікторини за встановленою моделлю даних (id, date, score, total)
 * @param {number} score - Кількість набраних балів
 * @param {number} total - Загальна кількість питань
 * @param {number|string} [id] - Унікальний ідентифікатор запису
 * @returns {{id?: number|string, date: string, score: number, total: number}}
 */
function createQuizResultRecord(score, total, id = undefined) {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const record = {
        date: dateStr,
        score: Number(score),
        total: Number(total)
    };

    if (id !== undefined) {
        record.id = id;
    }

    return record;
}

const LOCAL_STORAGE_KEY = 'quiz_results_v1';

/**
 * Зберігає масив результатів у localStorage у форматі JSON
 * @param {Array} items - Масив записів результатів
 */
function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
        console.error('[localStorage Error] Не вдалося зберегти дані у localStorage:', err);
    }
}

/**
 * Завантажує та парсить масив результатів із localStorage
 * @returns {Array|null} Масив результатів або null у разі помилки розбору
 */
function loadFromLocalStorage() {
    try {
        const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!rawData) return null;
        const parsed = JSON.parse(rawData);
        return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
        console.error('[localStorage Error] Помилка розбору даних з localStorage:', err);
        return null;
    }
}

/**
 * Конфігурація схеми IndexedDB (Варіант 8: назва бази "QuizDB", store "results", keyPath "id")
 */
const IDB_CONFIG = {
    dbName: 'QuizDB',
    version: 1,
    storeName: 'results',
    keyPath: 'id',
    autoIncrement: true
};

/**
 * Відкриває базу даних IndexedDB та створює сховище об'єктів у разі першого відкриття.
 * @returns {Promise<IDBDatabase>} Об'єкт відкритої бази даних IndexedDB
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB не підтримується у цьому браузері або недоступна.'));
            return;
        }

        const request = window.indexedDB.open(IDB_CONFIG.dbName, IDB_CONFIG.version);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IDB_CONFIG.storeName)) {
                db.createObjectStore(IDB_CONFIG.storeName, {
                    keyPath: IDB_CONFIG.keyPath,
                    autoIncrement: IDB_CONFIG.autoIncrement
                });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(new Error(`Помилка відкриття IndexedDB: ${event.target.error?.message || 'Невідома помилка'}`));
        };
    });
}

/**
 * Додає або оновлює запис у сховищі "results" (транзакція 'readwrite')
 * @param {Object} item - Об'єкт результату { id?, date, score, total }
 * @returns {Promise<number|string>} Повертає згенерований або існуючий id
 */
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_CONFIG.storeName, 'readwrite');
        const store = transaction.objectStore(IDB_CONFIG.storeName);
        
        const recordToSave = { ...item };
        if (recordToSave.id === undefined || recordToSave.id === null) {
            delete recordToSave.id;
        }

        const request = store.put(recordToSave);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(new Error(`Помилка збереження запису в IndexedDB: ${event.target.error?.message}`));
    });
}

/**
 * Оновлює існуючий запис у сховищі (використовує store.put)
 * @param {Object} item - Об'єкт результату з існуючим id
 * @returns {Promise<number|string>}
 */
async function updateItem(item) {
    return addItem(item);
}

/**
 * Зчитує всі записи зі сховища "results" (транзакція 'readonly')
 * @returns {Promise<Array>} Повертає масив усіх результатів із IndexedDB
 */
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_CONFIG.storeName, 'readonly');
        const store = transaction.objectStore(IDB_CONFIG.storeName);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = (event) => reject(new Error(`Помилка зчитування списку з IndexedDB: ${event.target.error?.message}`));
    });
}

/**
 * Видаляє запис за його id зі сховища "results" (транзакція 'readwrite')
 * @param {number|string} id - Ідентифікатор запису для видалення
 * @returns {Promise<void>}
 */
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_CONFIG.storeName, 'readwrite');
        const store = transaction.objectStore(IDB_CONFIG.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Помилка видалення запису з IndexedDB: ${event.target.error?.message}`));
    });
}

const MIGRATION_FLAG_KEY = 'quiz_idb_migrated_v1';

/**
 * Виконує одноразову міграцію даних із localStorage у сховище IndexedDB.
 * @returns {Promise<boolean>} Повертає true, якщо міграцію було здійснено
 */
async function migrateFromLocalStorage() {
    try {
        const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
        if (isMigrated === 'true') {
            return false;
        }

        const existingItems = await getAllItems();

        if (existingItems.length === 0) {
            const localData = loadFromLocalStorage();

            if (localData && localData.length > 0) {
                console.log('[Migration] Перенесення даних із localStorage у IndexedDB...');
                for (const item of localData) {
                    await addItem(item);
                }
                console.log('[Migration] Міграцію успішно завершено!');
            }
        }

        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return true;
    } catch (err) {
        console.error('[Migration Error] Помилка виконання міграції:', err);
        return false;
    }
}

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

/**
 * Дочірній компонент для відображення питання та варіантів відповідей
 */
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

/**
 * Головний React-компонент вікторини
 */
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
    const [idbErrorMessage, setIdbErrorMessage] = React.useState(null);
    const [history, setHistory] = React.useState([]);

    /**
     * Оновлює стан списку результатів даними із сховища IndexedDB та сортує на клієнті
     */
    const reloadHistoryFromIDB = async () => {
        try {
            await migrateFromLocalStorage();

            const items = await getAllItems();
            const sortedItems = [...items].sort((a, b) => (b.score - a.score) || (b.id - a.id));

            setHistory(sortedItems);
            saveToLocalStorage(sortedItems);
            setIdbErrorMessage(null);
        } catch (err) {
            console.error('[IndexedDB Load Error]', err);
            const userFriendlyMsg = `Увага: Не вдалося відкрити сховище IndexedDB (${err.message || 'Сховище заблоковано'}). Якщо ви у режимі приватного перегляду, дані зберігаються тимчасово у localStorage.`;
            setIdbErrorMessage(userFriendlyMsg);
            
            const fallback = loadFromLocalStorage() || [];
            setHistory(fallback);
        }
    };

    React.useEffect(() => {
        reloadHistoryFromIDB();
    }, []);

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

    const handleNextQuestion = async () => {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prevIndex) => prevIndex + 1);
            setSelectedIndex(null);
            setIsSubmitted(false);
            setResultFeedback(null);
        } else {
            setIsQuizFinished(true);
            const newRecord = createQuizResultRecord(score, questions.length);
            try {
                await addItem(newRecord);
            } catch (err) {
                console.error('[AddItem Error]', err);
            }
            await reloadHistoryFromIDB();
        }
    };

    const handleDeleteRecord = async (idToDelete) => {
        try {
            await deleteItem(idToDelete);
        } catch (err) {
            console.error('[DeleteItem Error]', err);
        }
        await reloadHistoryFromIDB();
    };

    const currentQ = questions[currentIndex];

    return (
        <div>
            {idbErrorMessage && (
                <div className="result-message active error" style={{ marginBottom: '16px' }}>
                    {idbErrorMessage}
                </div>
            )}

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
                <h2>Історія та найкращі результати</h2>
                <div className="cards">
                    {history.map((item) => (
                        <article key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <h3>{item.date}, Результат {item.score}/{item.total}</h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                onClick={() => handleDeleteRecord(item.id)}
                            >
                                Видалити
                            </button>
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
