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
 * Малює кадр 2D Canvas-таймера (фонова дуга, зменшувана дуга відліку та текст часу або паузи)
 * @param {CanvasRenderingContext2D} ctx - 2D-контекст полотна
 * @param {number} remainingTime - Залишковий час у секундах
 * @param {number} totalDuration - Початкова тривалість таймера у секундах
 * @param {number} [width=120] - Ширина полотна у пікселях
 * @param {number} [height=120] - Висота полотна у пікселях
 * @param {boolean} [isPaused=false] - Прапорець стану паузи
 */
function drawTimerState(ctx, remainingTime, totalDuration, width = 120, height = 120, isPaused = false) {
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 45;
    const lineWidth = 10;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const progress = Math.max(0, Math.min(1, remainingTime / totalDuration));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress * 2 * Math.PI);

    let strokeColor = '#16a34a';
    if (progress <= 0.25) {
        strokeColor = '#dc2626';
    } else if (progress <= 0.5) {
        strokeColor = '#eab308';
    }

    if (isPaused) {
        strokeColor = '#9333ea';
    }

    if (progress > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isPaused) {
        ctx.font = 'bold 16px Outfit, sans-serif';
        ctx.fillStyle = '#6b21a8';
        ctx.fillText('ПАУЗА', centerX, centerY);
    } else {
        const displaySeconds = Math.max(0, Math.ceil(remainingTime));
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.fillStyle = strokeColor;
        ctx.fillText(`${displaySeconds}с`, centerX, centerY);
    }
}

/**
 * Анімований React-компонент Canvas-таймера зворотного відліку на основі requestAnimationFrame
 * @param {Object} props
 * @param {number} [props.duration=15] - Тривалість відліку у секундах
 * @param {boolean} [props.isActive=true] - Чи активний таймер
 * @param {boolean} [props.isPaused=false] - Чи перебуває таймер на паузі
 * @param {any} [props.resetKey] - Ключ (індекс питання) для скидання відліку
 * @param {Function} [props.onTimeUp] - Колбек при вичерпанні часу (0с)
 */
function QuizTimerCanvas({ duration = 15, isActive = true, isPaused = false, resetKey, onTimeUp }) {
    const canvasRef = React.useRef(null);
    const startTimeRef = React.useRef(null);
    const animFrameRef = React.useRef(null);
    const pausedAccumulatorRef = React.useRef(0);
    const pauseStartRef = React.useRef(null);
    const prevResetKeyRef = React.useRef(resetKey);

    React.useEffect(() => {
        if (prevResetKeyRef.current !== resetKey) {
            prevResetKeyRef.current = resetKey;
            startTimeRef.current = null;
            pausedAccumulatorRef.current = 0;
            pauseStartRef.current = null;
        }
    }, [resetKey]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!isActive) {
            drawTimerState(ctx, 0, duration, canvas.width, canvas.height, false);
            return;
        }

        function renderFrame(timestamp) {
            if (isPaused) {
                if (!pauseStartRef.current) {
                    pauseStartRef.current = timestamp;
                }
                const currentElapsed = ((pauseStartRef.current - (startTimeRef.current || timestamp)) - pausedAccumulatorRef.current) / 1000;
                const remSeconds = Math.max(0, duration - currentElapsed);
                drawTimerState(ctx, remSeconds, duration, canvas.width, canvas.height, true);
                return;
            }

            if (pauseStartRef.current) {
                pausedAccumulatorRef.current += (timestamp - pauseStartRef.current);
                pauseStartRef.current = null;
            }

            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const totalElapsedSeconds = (timestamp - startTimeRef.current - pausedAccumulatorRef.current) / 1000;
            const remainingSeconds = Math.max(0, duration - totalElapsedSeconds);

            drawTimerState(ctx, remainingSeconds, duration, canvas.width, canvas.height, false);

            if (remainingSeconds > 0 && isActive) {
                animFrameRef.current = requestAnimationFrame(renderFrame);
            } else if (remainingSeconds <= 0) {
                if (onTimeUp) {
                    onTimeUp();
                }
            }
        }

        animFrameRef.current = requestAnimationFrame(renderFrame);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [duration, isActive, isPaused, onTimeUp]);

    return (
        <div className="timer-container">
            <canvas
                ref={canvasRef}
                width={120}
                height={120}
                className="timer-canvas"
                aria-label="Анімований таймер зворотного відліку"
            >
                Ваш браузер не підтримує елемент Canvas.
            </canvas>
        </div>
    );
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
 * Стартова сторінка застосунку.
 * Відображає привітання та кнопку для початку вікторини.
 */
function HomePage() {
    return (
        <section style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h2>Вітаємо у Вікторині!</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Перевірте свої знання у різних категоріях.</p>
            <a href="#/quiz" className="btn btn-primary" data-link>Почати вікторину</a>
        </section>
    );
}

/**
 * Сторінка вікторини.
 * Завантажує питання з API, керує таймером, рахунком та зберігає результат у БД.
 */
function QuizPage() {
    const [questions, setQuestions] = React.useState([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [score, setScore] = React.useState(0);
    const [selectedIndex, setSelectedIndex] = React.useState(null);
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [resultFeedback, setResultFeedback] = React.useState(null);
    const [isQuizFinished, setIsQuizFinished] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isTimerPaused, setIsTimerPaused] = React.useState(false);

    const fetchQuestions = async () => {
        setIsLoading(true);
        setError(null);
        setIsQuizFinished(false);
        try {
            const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
            if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);
            const data = await response.json();
            if (data.response_code !== 0 || !Array.isArray(data.results)) throw new Error('API повернув порожній список');

            const formattedQuestions = data.results.map((item, index) => {
                const decodedQuestion = decodeHTML(item.question);
                const decodedCorrect = decodeHTML(item.correct_answer);
                const decodedIncorrect = item.incorrect_answers.map(decodeHTML);
                const allOptions = shuffleArray([decodedCorrect, ...decodedIncorrect]);
                return {
                    id: index + 1,
                    question: decodedQuestion,
                    options: allOptions,
                    correctAnswer: decodedCorrect,
                    correctIndex: allOptions.indexOf(decodedCorrect)
                };
            });
            setQuestions(formattedQuestions);
            setCurrentIndex(0);
            setScore(0);
            setSelectedIndex(null);
            setIsSubmitted(false);
            setResultFeedback(null);
        } catch (err) {
            console.error(err);
            setError('Помилка завантаження. Перевірте мережу.');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => { fetchQuestions(); }, []);

    const handleTimeUp = React.useCallback(() => {
        setIsSubmitted((alreadySubmitted) => {
            if (!alreadySubmitted) {
                const currentQ = questions[currentIndex];
                setResultFeedback({
                    type: 'error',
                    message: `⏱ Час вичерпано! Правильна відповідь: "${currentQ ? currentQ.correctAnswer : ''}".`
                });
                return true;
            }
            return alreadySubmitted;
        });
    }, [questions, currentIndex]);

    const handleAnswerSelect = (index) => { if (!isSubmitted) setSelectedIndex(index); };

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        if (selectedIndex === null || isSubmitted) return;
        const currentQ = questions[currentIndex];
        const isCorrect = selectedIndex === currentQ.correctIndex;
        setIsSubmitted(true);
        if (isCorrect) {
            setScore(prev => prev + 1);
            setResultFeedback({ type: 'success', message: `Правильно!` });
        } else {
            setResultFeedback({ type: 'error', message: `Неправильно. Правильна відповідь: "${currentQ.correctAnswer}".` });
        }
    };

    const handleNextQuestion = async () => {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(prev => prev + 1);
            setSelectedIndex(null);
            setIsSubmitted(false);
            setIsTimerPaused(false);
            setResultFeedback(null);
        } else {
            setIsQuizFinished(true);
            const newRecord = createQuizResultRecord(score, questions.length);
            try {
                await addItem(newRecord);
                window.location.hash = '/results';
            } catch (err) { console.error(err); }
        }
    };

    const currentQ = questions[currentIndex];

    return (
        <section id="поточне_питання">
            {isLoading && <div className="result-message active info">Завантаження питань...</div>}
            {error && <div className="result-message active error">{error}</div>}
            {!isLoading && !error && !isQuizFinished && currentQ && (
                <form onSubmit={handleSubmitAnswer}>
                    <div className="quiz-progress-header">
                        <div className="quiz-progress-info">
                            <h2 className="question-number">Питання {currentIndex + 1} з {questions.length}</h2>
                            <div className="progress-bar-track">
                                <div className="progress-bar-fill" style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}></div>
                            </div>
                        </div>
                        <QuizTimerCanvas duration={15} isActive={!isSubmitted} isPaused={isTimerPaused} resetKey={currentIndex} onTimeUp={handleTimeUp} />
                    </div>
                    <QuizQuestion question={currentQ.question} options={currentQ.options} correctIndex={currentQ.correctIndex} selectedIndex={selectedIndex} isSubmitted={isSubmitted} onAnswer={handleAnswerSelect} />
                    {resultFeedback && <div className={`result-message active ${resultFeedback.type}`}>{resultFeedback.message}</div>}
                    <div className="form-actions">
                        {!isSubmitted ? (
                            <button type="submit" className="btn btn-primary" disabled={selectedIndex === null}>Відповісти</button>
                        ) : (
                            <button type="button" className="btn btn-primary" onClick={handleNextQuestion}>
                                {currentIndex + 1 < questions.length ? 'Наступне' : 'Завершити'}
                            </button>
                        )}
                        {!isSubmitted && (
                            <button type="button" className="btn btn-secondary" onClick={() => setIsTimerPaused(prev => !prev)}>
                                {isTimerPaused ? 'Продовжити' : 'Пауза'}
                            </button>
                        )}
                    </div>
                </form>
            )}
        </section>
    );
}

/**
 * Сторінка історії результатів.
 * Завантажує всі збережені спроби з IndexedDB та виводить їх списком.
 */
function ResultsPage() {
    const [history, setHistory] = React.useState([]);

    const loadData = async () => {
        try {
            await migrateFromLocalStorage();
            const items = await getAllItems();
            setHistory([...items].sort((a, b) => (b.score - a.score) || (b.id - a.id)));
        } catch (err) {
            setHistory(loadFromLocalStorage() || []);
        }
    };

    React.useEffect(() => { loadData(); }, []);

    const handleDelete = async (id) => {
        await deleteItem(id);
        loadData();
    };

    return (
        <section id="історія_спроб">
            <h2>Історія результатів</h2>
            <div className="cards">
                {history.length === 0 ? <p>Історія порожня.</p> : history.map(item => (
                    <article key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <h3>{item.date}, Результат {item.score}/{item.total}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={`#/results/${item.id}`} className="btn btn-primary" style={{ padding: '4px 12px' }} data-link>Деталі</a>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => handleDelete(item.id)}>Видалити</button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * Сторінка деталей результату.
 * Знаходить конкретний запис за переданим ідентифікатором та відображає його детальну статистику.
 */
function ResultDetailsPage({ id }) {
    const [record, setRecord] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchRecord = async () => {
            try {
                const items = await getAllItems();
                const found = items.find(i => String(i.id) === String(id));
                setRecord(found || null);
            } catch (e) {
                console.error('Помилка завантаження деталей:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchRecord();
    }, [id]);

    if (loading) {
        return <p style={{textAlign: 'center', padding: '40px'}}>Завантаження...</p>;
    }
    
    if (!record) {
        return (
            <section style={{ textAlign: 'center', padding: '40px' }}>
                <h2>Запис не знайдено</h2>
                <p>Можливо, він був видалений або ви перейшли за хибним посиланням.</p>
                <a href="#/results" className="btn btn-primary" data-link style={{ marginTop: '20px', display: 'inline-block' }}>Повернутися до історії</a>
            </section>
        );
    }

    return (
        <section style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h2>Деталі спроби #{record.id}</h2>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', maxWidth: '400px', margin: '20px auto', border: '1px solid #e2e8f0' }}>
                <p style={{fontSize: '1.2rem', margin: '10px 0'}}><strong>Дата:</strong> {record.date}</p>
                <p style={{fontSize: '1.2rem', margin: '10px 0'}}><strong>Відповідей:</strong> {record.score} з {record.total}</p>
                <p style={{fontSize: '1.2rem', margin: '10px 0'}}><strong>Успішність:</strong> {Math.round((record.score / record.total) * 100)}%</p>
            </div>
            <a href="#/results" className="btn btn-secondary" data-link style={{ display: 'inline-block' }}>Назад до списку</a>
        </section>
    );
}

/**
 * Таблиця маршрутів застосунку.
 * Зіставляє шляхи (URL) з відповідними React-компонентами.
 */
const routes = [
    { path: '/', component: HomePage },
    { path: '/quiz', component: QuizPage },
    { path: '/results', component: ResultsPage },
    { path: '/results/:id', component: ResultDetailsPage }
];

/**
 * Функція для пошуку відповідного маршруту за поточним шляхом.
 * Аналізує динамічні параметри у URL та повертає знайдений компонент разом із параметрами.
 */
function matchRoute(path) {
    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) continue;
        let match = true;
        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                match = false;
                break;
            }
        }
        if (match) return { route, params };
    }
    return null;
}

/**
 * Здійснює програмну клієнтську навігацію, змінюючи хеш браузера.
 */
function navigate(path) {
    window.location.hash = path;
}

// Глобальний обробник подій для перехоплення кліків по внутрішніх посиланнях
document.body.addEventListener('click', e => {
    const link = e.target.closest('a[data-link]');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            navigate(href.slice(1));
        }
    }
});

/**
 * Сторінка обробки неіснуючих маршрутів (Помилка 404).
 */
function NotFoundPage() {
    return (
        <section style={{ textAlign: 'center', padding: '50px 20px' }}>
            <h2 style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '10px' }}>404</h2>
            <p style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Сторінку не знайдено</p>
            <p style={{ marginBottom: '30px' }}>Схоже, ви перейшли за неправильним посиланням.</p>
            <a href="#/" className="btn btn-primary" data-link>На головну</a>
        </section>
    );
}

/**
 * Головний компонент-маршрутизатор застосунку.
 * Відстежує зміни хешу браузера та динамічно відмальовує відповідну сторінку.
 */
function App() {
    const [currentPath, setCurrentPath] = React.useState(window.location.hash.slice(1) || '/');

    React.useEffect(() => {
        const handleHashChange = () => {
            let newPath = window.location.hash.slice(1);
            if (!newPath) newPath = '/';
            setCurrentPath(newPath);
        };

        window.addEventListener('hashchange', handleHashChange);
        
        if (!window.location.hash) {
            window.location.hash = '/';
        }

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const matched = matchRoute(currentPath);

    if (!matched) {
        return <NotFoundPage />;
    }

    const { route, params } = matched;
    const Component = route.component;

    return <Component {...params} />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
