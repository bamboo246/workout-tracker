// ----------------------------------------------------
// PWA SERVICE WORKER REGISTRATION
// ----------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered!', reg))
      .catch(err => console.log('Service Worker Registration Failed!', err));
  });
}

// ----------------------------------------------------
// DEFAULT EXERCISES MASTER DATA
// ----------------------------------------------------
const DEFAULT_EXERCISES = [
  { id: '1', name: 'ベンチプレス (Bench Press)', category: '胸', emoji: '🏋️‍♂️' },
  { id: '2', name: 'ダンベルフライ (Dumbbell Fly)', category: '胸', emoji: '👐' },
  { id: '3', name: 'プッシュアップ (Push Ups)', category: '胸', emoji: '🤸‍♂️' },
  
  { id: '4', name: 'ラットプルダウン (Lat Pulldown)', category: '背中', emoji: '🚣‍♂️' },
  { id: '5', name: 'バーベルロウ (Barbell Row)', category: '背中', emoji: '🏋️' },
  { id: '6', name: 'チンニング (Pull Ups)', category: '背中', emoji: '🧗' },
  
  { id: '7', name: 'スクワット (Squats)', category: '脚', emoji: '🦵' },
  { id: '8', name: 'レッグプレス (Leg Press)', category: '脚', emoji: '🏋️‍♀️' },
  { id: '9', name: 'レッグカール (Leg Curl)', category: '脚', emoji: '🦵' },
  
  { id: '10', name: 'ショルダープレス (Shoulder Press)', category: '肩', emoji: '🏋️‍♂️' },
  { id: '11', name: 'サイドレイズ (Lateral Raise)', category: '肩', emoji: '🦅' },
  
  { id: '12', name: 'アームカール (Bicep Curl)', category: '腕', emoji: '💪' },
  { id: '13', name: 'トライセップスエクステンション', category: '腕', emoji: '💪' },
  
  { id: '14', name: 'クランチ (Crunch)', category: '腹筋', emoji: '🧘' },
  { id: '15', name: 'プランク (Plank)', category: '腹筋', emoji: '🤸' },
  
  { id: '16', name: 'デッドリフト (Deadlift)', category: 'その他', emoji: '🏋️' }
];

// ----------------------------------------------------
// APPLICATION STATE MANAGEMENT
// ----------------------------------------------------
// ----------------------------------------------------
// RECOMMENDED ROUTINES
// ----------------------------------------------------
const RECOMMENDED_ROUTINES = [
  { id: 'rec-1', name: '全身引き締め (初心者向け)', exercises: ['7', '1', '4'] },
  { id: 'rec-2', name: '胸・肩・三頭 (Push)', exercises: ['1', '10', '11'] },
  { id: 'rec-3', name: '背中・二頭 (Pull)', exercises: ['4', '5', '12'] },
  { id: 'rec-4', name: '下半身 (Legs)', exercises: ['7', '9', '8'] }
];

let state = {
  activeScreen: 'dashboard',
  exercises: [], // Combines default and user created
  workoutHistory: [], // Workout log objects
  streak: 0,
  activeWorkout: null, // Workout in progress: { name, startTime, durationSeconds, exercises: [] }
  activeTimer: {
    duration: 90, // default rest interval: 90s
    remaining: 0,
    intervalId: null,
    isRunning: false
  },
  selectedHistoryTab: 'logs', // 'logs' or 'stats'
  selectedExerciseFilter: 'すべて', // Filter chip state
  meals: [], // Meals list
  bodyMetrics: [], // Body metrics list
  selectedBodyTab: 'meals', // 'meals' or 'metrics'
  routines: [], // Custom workout routines
  selectedChartExerciseId: '1', // Default exercise for 1RM chart (1 = Bench Press)
  editingPastWorkout: null, // Workout being edited
  exerciseSelectContext: 'activeWorkout', // 'activeWorkout' or 'editPastWorkout'
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth()
};

// ----------------------------------------------------
// DATABASE (LOCALSTORAGE HELPER)
// ----------------------------------------------------
const DB = {
  load() {
    // 1. Load Exercises
    const localEx = localStorage.getItem('wt_exercises');
    if (localEx) {
      state.exercises = JSON.parse(localEx);
    } else {
      state.exercises = [...DEFAULT_EXERCISES];
      localStorage.setItem('wt_exercises', JSON.stringify(state.exercises));
    }

    // 2. Load History
    const localHist = localStorage.getItem('wt_history');
    if (localHist) {
      state.workoutHistory = JSON.parse(localHist);
    } else {
      // Mock history for 3 days of workouts
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      state.workoutHistory = [
        {
          id: 'mock-1',
          name: '胸と三頭のトレーニング',
          date: threeDaysAgo,
          durationSeconds: 2700,
          exercises: [
            {
              id: '1',
              name: 'ベンチプレス (Bench Press)',
              category: '胸',
              sets: [
                { weight: 60, reps: 10, rpe: 8, completed: true },
                { weight: 65, reps: 8, rpe: 8.5, completed: true },
                { weight: 70, reps: 6, rpe: 9, completed: true }
              ]
            },
            {
              id: '12',
              name: 'アームカール (Bicep Curl)',
              category: '腕',
              sets: [
                { weight: 12.5, reps: 12, rpe: 8, completed: true },
                { weight: 12.5, reps: 10, rpe: 9, completed: true }
              ]
            }
          ]
        },
        {
          id: 'mock-2',
          name: '背中と二頭のトレーニング',
          date: twoDaysAgo,
          durationSeconds: 3000,
          exercises: [
            {
              id: '4',
              name: 'ラットプルダウン (Lat Pulldown)',
              category: '背中',
              sets: [
                { weight: 45, reps: 12, rpe: 7.5, completed: true },
                { weight: 50, reps: 10, rpe: 8, completed: true },
                { weight: 55, reps: 8, rpe: 9, completed: true }
              ]
            }
          ]
        },
        {
          id: 'mock-3',
          name: '脚の日 (Squats Focus)',
          date: yesterday,
          durationSeconds: 3200,
          exercises: [
            {
              id: '7',
              name: 'スクワット (Squats)',
              category: '脚',
              sets: [
                { weight: 70, reps: 10, rpe: 8, completed: true },
                { weight: 80, reps: 8, rpe: 8.5, completed: true },
                { weight: 90, reps: 6, rpe: 9.5, completed: true }
              ]
            }
          ]
        }
      ];
      localStorage.setItem('wt_history', JSON.stringify(state.workoutHistory));
    }

    // 3. Load Active Workout Session (recovery support)
    const localActive = localStorage.getItem('wt_active_workout');
    if (localActive) {
      state.activeWorkout = JSON.parse(localActive);
    }

    // 4. Load Streak
    this.calculateStreak();

    // 5. Load Meals
    const localMeals = localStorage.getItem('wt_meals');
    if (localMeals) {
      state.meals = JSON.parse(localMeals);
    } else {
      const now = new Date();
      
      const breakfastTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0).toISOString();
      const lunchTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 45, 0).toISOString();
      const dinnerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 15, 0).toISOString();
      const snackTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0).toISOString();
      
      state.meals = [
        { id: 'm-1', date: breakfastTime, type: '朝食', memo: 'プロテイン、オートミール、バナナ', calories: 380 },
        { id: 'm-2', date: lunchTime, type: '昼食', memo: 'チキンサラダプレート、玄米', calories: 540 },
        { id: 'm-3', date: snackTime, type: '間食', memo: 'オイコスヨーグルト、ナッツ', calories: 180 },
        { id: 'm-4', date: dinnerTime, type: '夕食', memo: 'サバの塩焼き、ごはん、味噌汁', calories: 620 }
      ];
      localStorage.setItem('wt_meals', JSON.stringify(state.meals));
    }

    // 6. Load Body Metrics
    const localMetrics = localStorage.getItem('wt_body_metrics');
    if (localMetrics) {
      state.bodyMetrics = JSON.parse(localMetrics);
    } else {
      const msInDay = 24 * 60 * 60 * 1000;
      const t = Date.now();
      state.bodyMetrics = [
        { id: 'bm-1', date: new Date(t - 6 * msInDay).toISOString(), weight: 66.8, fat: 16.5, muscle: 32.0 },
        { id: 'bm-2', date: new Date(t - 5 * msInDay).toISOString(), weight: 66.5, fat: 16.3, muscle: 32.1 },
        { id: 'bm-3', date: new Date(t - 4 * msInDay).toISOString(), weight: 66.2, fat: 16.2, muscle: 32.1 },
        { id: 'bm-4', date: new Date(t - 3 * msInDay).toISOString(), weight: 66.4, fat: 16.1, muscle: 32.2 },
        { id: 'bm-5', date: new Date(t - 2 * msInDay).toISOString(), weight: 65.9, fat: 15.9, muscle: 32.3 },
        { id: 'bm-6', date: new Date(t - 1 * msInDay).toISOString(), weight: 65.7, fat: 15.8, muscle: 32.4 },
        { id: 'bm-7', date: new Date(t).toISOString(), weight: 65.5, fat: 15.6, muscle: 32.5 }
      ];
      localStorage.setItem('wt_body_metrics', JSON.stringify(state.bodyMetrics));
    }

    // 7. Load Custom Routines
    const localRoutines = localStorage.getItem('wt_routines');
    if (localRoutines) {
      state.routines = JSON.parse(localRoutines);
    } else {
      state.routines = [];
    }
  },

  saveExercises() {
    localStorage.setItem('wt_exercises', JSON.stringify(state.exercises));
  },

  saveHistory() {
    localStorage.setItem('wt_history', JSON.stringify(state.workoutHistory));
    this.calculateStreak();
  },

  saveActiveWorkout() {
    if (state.activeWorkout) {
      localStorage.setItem('wt_active_workout', JSON.stringify(state.activeWorkout));
    } else {
      localStorage.removeItem('wt_active_workout');
    }
  },

  saveMeals() {
    localStorage.setItem('wt_meals', JSON.stringify(state.meals));
  },

  saveBodyMetrics() {
    localStorage.setItem('wt_body_metrics', JSON.stringify(state.bodyMetrics));
  },

  saveRoutines() {
    localStorage.setItem('wt_routines', JSON.stringify(state.routines));
  },

  calculateStreak() {
    if (state.workoutHistory.length === 0) {
      state.streak = 0;
      return;
    }

    // Sort by date desc
    const sortedDates = state.workoutHistory
      .map(w => new Date(w.date).toDateString())
      .filter((val, idx, self) => self.indexOf(val) === idx); // unique dates

    if (sortedDates.length === 0) {
      state.streak = 0;
      return;
    }

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if user has a workout today or yesterday to continue streak
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      state.streak = 0;
      return;
    }

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffTime = Math.abs(curr - next);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        break; // Streak broken
      }
    }
    state.streak = streak;
  }
};

// ----------------------------------------------------
// UI ELEMENTS CACHE
// ----------------------------------------------------
const el = {
  // Screens
  screens: {
    dashboard: document.getElementById('screen-dashboard'),
    logger: document.getElementById('screen-logger'),
    history: document.getElementById('screen-history'),
    body: document.getElementById('screen-body'),
    exercises: document.getElementById('screen-exercises')
  },
  // Nav
  nav: {
    dashboard: document.getElementById('nav-btn-dashboard'),
    logger: document.getElementById('nav-btn-logger'),
    history: document.getElementById('nav-btn-history'),
    body: document.getElementById('nav-btn-body'),
    exercises: document.getElementById('nav-btn-exercises'),
    indicator: document.getElementById('active-workout-indicator')
  },
  // Dashboard
  pageTitle: document.getElementById('page-title'),
  streakCount: document.getElementById('streak-count'),
  btnQuickStart: document.getElementById('btn-quick-start'),
  statWeeklyCount: document.getElementById('stat-weekly-count'),
  statWeeklyVolume: document.getElementById('stat-weekly-volume'),
  recentLogsList: document.getElementById('recent-logs-list'),
  cardStatusWorkout: document.getElementById('card-status-workout'),
  cardStatusMeals: document.getElementById('card-status-meals'),
  cardStatusMetrics: document.getElementById('card-status-metrics'),
  labelStatusWorkout: document.getElementById('label-status-workout'),
  labelStatusMeals: document.getElementById('label-status-meals'),
  labelStatusMetrics: document.getElementById('label-status-metrics'),
  
  // Logger
  loggerInactive: document.getElementById('logger-inactive'),
  loggerActive: document.getElementById('logger-active'),
  btnStartSession: document.getElementById('btn-start-session'),
  inputWorkoutName: document.getElementById('input-workout-name'),
  workoutDurationTimer: document.getElementById('workout-duration-timer'),
  btnAddExercise: document.getElementById('btn-add-exercise'),
  btnQuickTimer: document.getElementById('btn-quick-timer'),
  activeExercisesList: document.getElementById('active-exercises-list'),
  btnCancelWorkout: document.getElementById('btn-cancel-workout'),
  btnFinishWorkout: document.getElementById('btn-finish-workout'),
  
  // History
  btnHistoryLogs: document.getElementById('btn-history-tab-logs'),
  btnHistoryStats: document.getElementById('btn-history-tab-stats'),
  panelHistoryLogs: document.getElementById('history-panel-logs'),
  panelHistoryStats: document.getElementById('history-panel-stats'),
  historyList: document.getElementById('history-list'),
  statAlltimeCount: document.getElementById('stat-alltime-count'),
  statAlltimeVolume: document.getElementById('stat-alltime-volume'),
  volumeChartSvg: document.getElementById('volume-chart-svg'),
  
  // Body screen (Meals & Metrics)
  btnBodyMeals: document.getElementById('btn-body-tab-meals'),
  btnBodyMetrics: document.getElementById('btn-body-tab-metrics'),
  panelBodyMeals: document.getElementById('body-panel-meals'),
  panelBodyMetrics: document.getElementById('body-panel-metrics'),
  mealTodayCalories: document.getElementById('meal-today-calories'),
  btnAddMeal: document.getElementById('btn-add-meal'),
  mealsTimelineList: document.getElementById('meals-timeline-list'),
  btnAddMetric: document.getElementById('btn-add-metric'),
  metricCurrWeight: document.getElementById('metric-curr-weight'),
  metricCurrFat: document.getElementById('metric-curr-fat'),
  metricsChartSvg: document.getElementById('metrics-chart-svg'),
  metricsHistoryList: document.getElementById('metrics-history-list'),
  
  // Exercises
  inputSearchExercise: document.getElementById('input-search-exercise'),
  btnNewExercise: document.getElementById('btn-new-exercise'),
  exerciseCategoryFilters: document.getElementById('exercise-category-filters'),
  exerciseMasterList: document.getElementById('exercise-master-list'),
  
  // Modals
  modalSelectExercise: document.getElementById('modal-select-exercise'),
  modalSearchInput: document.getElementById('modal-search-input'),
  modalExerciseList: document.getElementById('modal-exercise-list'),
  
  modalTimer: document.getElementById('modal-timer'),
  timerProgressBar: document.getElementById('timer-progress'),
  timerText: document.getElementById('timer-text'),
  btnTimerToggle: document.getElementById('btn-timer-toggle'),
  btnTimerReset: document.getElementById('btn-timer-reset'),
  
  modalCreateExercise: document.getElementById('modal-create-exercise'),
  formCreateExercise: document.getElementById('form-create-exercise'),
  inputNewExerciseName: document.getElementById('input-new-exercise-name'),
  selectNewExerciseCategory: document.getElementById('select-new-exercise-category'),
  
  modalCreateMeal: document.getElementById('modal-create-meal'),
  formCreateMeal: document.getElementById('form-create-meal'),
  selectMealType: document.getElementById('select-meal-type'),
  inputMealMemo: document.getElementById('input-meal-memo'),
  inputMealCalories: document.getElementById('input-meal-calories'),
  inputMealImage: document.getElementById('input-meal-image'),
  mealImagePreview: document.getElementById('meal-image-preview'),
  imgMealPreview: document.getElementById('img-meal-preview'),
  
  modalCreateMetric: document.getElementById('modal-create-metric'),
  formCreateMetric: document.getElementById('form-create-metric'),
  inputMetricWeight: document.getElementById('input-metric-weight'),
  inputMetricFat: document.getElementById('input-metric-fat'),
  inputMetricMuscle: document.getElementById('input-metric-muscle'),

  // Calendar & Routines & 1RM
  dashboardCalendar: document.getElementById('dashboard-calendar'),
  recommendedRoutinesList: document.getElementById('recommended-routines-list'),
  customRoutinesList: document.getElementById('custom-routines-list'),
  btnCreateRoutine: document.getElementById('btn-create-routine'),
  modalCreateRoutine: document.getElementById('modal-create-routine'),
  formCreateRoutine: document.getElementById('form-create-routine'),
  inputRoutineName: document.getElementById('input-routine-name'),
  routineExercisesCheckboxes: document.getElementById('routine-exercises-checkboxes'),
  selectChartExercise: document.getElementById('select-chart-exercise'),
  oneRmChartSvg: document.getElementById('1rm-chart-svg'),
  
  // Floating timer
  floatingRestTimer: document.getElementById('floating-rest-timer'),
  floatingTimerText: document.getElementById('floating-timer-text'),

  // Edit Past Workout Modal
  modalEditPastWorkout: document.getElementById('modal-edit-past-workout'),
  formEditPastWorkout: document.getElementById('form-edit-past-workout'),
  inputEditPastId: document.getElementById('input-edit-past-id'),
  inputEditPastName: document.getElementById('input-edit-past-name'),
  inputEditPastDate: document.getElementById('input-edit-past-date'),
  btnEditPastAddExercise: document.getElementById('btn-edit-past-add-exercise'),
  editPastExercisesList: document.getElementById('edit-past-exercises-list'),
  
  // Calendar Day Detail Modal
  modalCalendarDayDetail: document.getElementById('modal-calendar-day-detail'),
  calendarDayDetailTitle: document.getElementById('calendar-day-detail-title'),
  calendarDayDetailContent: document.getElementById('calendar-day-detail-content')
};

// ----------------------------------------------------
// WORKOUT LOGGER TIMER (DURATION RUNNING IN SESSION)
// ----------------------------------------------------
let sessionTimerInterval = null;
function startSessionTimer() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  
  sessionTimerInterval = setInterval(() => {
    if (!state.activeWorkout) return;
    
    const elapsedMs = Date.now() - state.activeWorkout.startTime;
    const totalSecs = Math.floor(elapsedMs / 1000);
    
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    
    el.workoutDurationTimer.textContent = `${mins}:${secs}`;
    state.activeWorkout.durationSeconds = totalSecs;
    
    // Auto-save session periodically
    DB.saveActiveWorkout();
  }, 1000);
}

function stopSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

// ----------------------------------------------------
// CORE SCREEN NAVIGATION
// ----------------------------------------------------
function navigateTo(screenId) {
  state.activeScreen = screenId;
  
  // Update Navbar Active state
  Object.keys(el.nav).forEach(key => {
    if (key === 'indicator') return;
    if (key === screenId) {
      el.nav[key].classList.add('active');
    } else {
      el.nav[key].classList.remove('active');
    }
  });
  
  // Update Screens Active state
  Object.keys(el.screens).forEach(key => {
    if (key === screenId) {
      el.screens[key].classList.add('active');
    } else {
      el.screens[key].classList.remove('active');
    }
  });

  // Adjust Page Title in Header
  const titles = {
    dashboard: 'ダッシュボード',
    logger: 'ワークアウト記録',
    history: 'トレーニング履歴',
    body: '食事・体重管理',
    exercises: '種目マスター'
  };
  el.pageTitle.textContent = titles[screenId] || '筋トレログ';

  // Render content depending on active screen
  if (screenId === 'dashboard') renderDashboard();
  if (screenId === 'logger') renderLogger();
  if (screenId === 'history') renderHistory();
  if (screenId === 'body') renderBodyScreen();
  if (screenId === 'exercises') renderExercises();
}

// Attach Nav events
Object.keys(el.nav).forEach(key => {
  if (key === 'indicator') return;
  el.nav[key].addEventListener('click', () => {
    if (key === 'logger') {
      if (!state.activeWorkout) {
        startNewWorkoutSession();
      } else {
        navigateTo('logger');
      }
    } else {
      navigateTo(key);
    }
  });
});

// ----------------------------------------------------
// TAB / MODAL CONTROLLERS (GENERIC)
// ----------------------------------------------------
function openModal(modalEl) {
  modalEl.classList.add('active');
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
}

// Attach close click for all modals
document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal-overlay');
    closeModal(modal);
  });
});

// Close modal when clicking on the overlay background
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });
});

// Bind Dashboard Status Cards Click Events
el.cardStatusWorkout.addEventListener('click', () => {
  if (!state.activeWorkout) {
    startNewWorkoutSession();
  } else {
    navigateTo('logger');
  }
});

el.cardStatusMeals.addEventListener('click', () => {
  state.selectedBodyTab = 'meals';
  navigateTo('body');
  // Auto-open meals modal
  el.inputMealMemo.value = '';
  el.inputMealCalories.value = '';
  el.selectMealType.value = '朝食';
  openModal(el.modalCreateMeal);
});

el.cardStatusMetrics.addEventListener('click', () => {
  state.selectedBodyTab = 'metrics';
  navigateTo('body');
  // Auto-open metrics modal
  el.inputMetricWeight.value = '';
  el.inputMetricFat.value = '';
  el.inputMetricMuscle.value = '';
  openModal(el.modalCreateMetric);
});

// ----------------------------------------------------
// SCREEN 1: DASHBOARD RENDERER
// ----------------------------------------------------
function renderDashboard() {
  // Update streak count UI
  el.streakCount.textContent = state.streak;

  // Calculate today's status card values
  const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  
  // 1. Workout Status
  if (state.activeWorkout) {
    el.labelStatusWorkout.textContent = '記録中 (タップして戻る)';
    el.labelStatusWorkout.style.color = 'var(--primary)';
  } else {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayWorkouts = state.workoutHistory.filter(w => new Date(w.date).getTime() >= todayStart.getTime());
    if (todayWorkouts.length > 0) {
      el.labelStatusWorkout.textContent = `完了 (${todayWorkouts.length}件 - タップして追加)`;
      el.labelStatusWorkout.style.color = 'var(--success)';
    } else {
      el.labelStatusWorkout.textContent = '未実施 (タップして開始)';
      el.labelStatusWorkout.style.color = 'var(--text-secondary)';
    }
  }

  // 2. Meal Status
  const todayMeals = state.meals.filter(meal => {
    const mealDate = new Date(meal.date);
    const mealDateStr = mealDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    return mealDateStr === todayStr;
  });
  const totalCalories = todayMeals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
  el.labelStatusMeals.textContent = `${totalCalories.toLocaleString()} kcal (タップして記録)`;
  el.labelStatusMeals.style.color = totalCalories > 0 ? 'var(--success)' : 'var(--text-secondary)';

  // 3. Weight/Metrics Status
  const todayMetrics = state.bodyMetrics.filter(m => {
    const mDate = new Date(m.date);
    const mDateStr = mDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    return mDateStr === todayStr;
  });
  if (todayMetrics.length > 0) {
    const latestWeight = todayMetrics[0].weight;
    el.labelStatusMetrics.textContent = `${latestWeight.toFixed(1)} kg (タップして追加記録)`;
    el.labelStatusMetrics.style.color = 'var(--warning)';
  } else {
    // If not measured today, but there's a past weight, show it as reference
    const sortedAllMetrics = [...state.bodyMetrics].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortedAllMetrics.length > 0) {
      el.labelStatusMetrics.textContent = `未測定 (前回: ${sortedAllMetrics[0].weight.toFixed(1)} kg)`;
    } else {
      el.labelStatusMetrics.textContent = '未測定 (タップして記録)';
    }
    el.labelStatusMetrics.style.color = 'var(--text-secondary)';
  }

  // Calculate weekly stats (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyWorkouts = state.workoutHistory.filter(w => new Date(w.date).getTime() >= oneWeekAgo);
  
  let weeklyVolume = 0;
  weeklyWorkouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          weeklyVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }
      });
    });
  });

  el.statWeeklyCount.textContent = weeklyWorkouts.length;
  el.statWeeklyVolume.textContent = weeklyVolume.toLocaleString();

  // Render recent logs (max 3)
  el.recentLogsList.innerHTML = '';
  const recentLogs = [...state.workoutHistory]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  if (recentLogs.length === 0) {
    el.recentLogsList.innerHTML = '<div class="no-data">まだ筋トレの記録がありません。下の「記録する」から最初のワークアウトを開始しましょう！</div>';
  } else {
    recentLogs.forEach(log => {
      const card = document.createElement('div');
      card.className = 'glass-card log-summary-card';
      card.addEventListener('click', () => {
        navigateTo('history');
        switchHistoryTab('logs');
      });

      // Calculate details
      let vol = 0;
      let setsCount = 0;
      log.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed) {
            vol += (Number(set.weight) || 0) * (Number(set.reps) || 0);
            setsCount++;
          }
        });
      });

      const dateStr = new Date(log.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
      
      card.innerHTML = `
        <div class="log-summary-info">
          <h4>${escapeHTML(log.name)}</h4>
          <p>${dateStr} • ${setsCount}セット完了</p>
        </div>
        <div class="log-summary-stats">
          <span class="log-summary-val">${vol.toLocaleString()} <span style="font-size:0.7rem; color:var(--text-muted)">kg</span></span>
          <div class="log-summary-lbl">トレーニングボリューム</div>
        </div>
      `;
      el.recentLogsList.appendChild(card);
    });
  }

  // Render monthly calendar stamps
  renderCalendar();
}

// ----------------------------------------------------
// SCREEN 2: WORKOUT LOGGER RENDERER & ACTIONS
// ----------------------------------------------------
function renderLogger() {
  if (state.activeWorkout) {
    // Show active screen
    el.loggerInactive.style.display = 'none';
    el.loggerActive.style.display = 'block';
    
    // Set field values
    el.inputWorkoutName.value = state.activeWorkout.name;
    el.nav.indicator.style.display = 'block'; // active session badge in footer navbar

    // Render exercises and sets
    renderActiveExercises();
    
    // Start duration tick
    startSessionTimer();
  } else {
    // Show inactive screen
    el.loggerInactive.style.display = 'block';
    el.loggerActive.style.display = 'none';
    el.nav.indicator.style.display = 'none';
    stopSessionTimer();
    // Render programs & routines
    renderRoutines();
  }
}

// Setup active workout
function startNewWorkoutSession(name = null, exerciseIds = []) {
  if (!name) {
    const today = new Date().toDateString();
    const todayWorkoutsCount = state.workoutHistory.filter(w => new Date(w.date).toDateString() === today).length;
    if (todayWorkoutsCount === 0) {
      name = '朝のトレーニング';
    } else if (todayWorkoutsCount === 1) {
      name = '昼のトレーニング';
    } else if (todayWorkoutsCount === 2) {
      name = '夜のトレーニング';
    } else {
      name = `今日のトレーニング (${todayWorkoutsCount + 1}回目)`;
    }
  }

  // Pre-load routine exercises if specified
  const exercisesToLoad = [];
  if (exerciseIds && exerciseIds.length > 0) {
    exerciseIds.forEach(id => {
      const ex = state.exercises.find(e => e.id === id);
      if (ex) {
        exercisesToLoad.push({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          sets: [{ weight: '', reps: '', rpe: '', completed: false }]
        });
      }
    });
  }

  state.activeWorkout = {
    name: name,
    startTime: Date.now(),
    durationSeconds: 0,
    exercises: exercisesToLoad
  };
  DB.saveActiveWorkout();
  navigateTo('logger');
}

el.btnStartSession.addEventListener('click', () => startNewWorkoutSession());
el.btnQuickStart.addEventListener('click', () => startNewWorkoutSession());

el.inputWorkoutName.addEventListener('input', (e) => {
  if (state.activeWorkout) {
    state.activeWorkout.name = e.target.value;
    DB.saveActiveWorkout();
  }
});

// Helper function to calculate estimated 1RM using Epley formula
function calculateEpley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Helper to find the maximum estimated 1RM for completed sets of an exercise in the active workout
function getActiveExerciseMax1RM(ex) {
  let max1RM = 0;
  ex.sets.forEach(set => {
    if (set.completed && set.weight > 0 && set.reps > 0) {
      const e1rm = calculateEpley1RM(set.weight, set.reps);
      if (e1rm > max1RM) {
        max1RM = e1rm;
      }
    }
  });
  return max1RM;
}

// Helper function to copy sets from the user's most recent workout containing the exercise
function copyPreviousWorkoutSets(exId, exIndex) {
  const sortedHist = [...state.workoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  let foundEx = null;
  for (const workout of sortedHist) {
    foundEx = workout.exercises.find(ex => ex.id === exId);
    if (foundEx) break;
  }
  
  if (foundEx && foundEx.sets && foundEx.sets.length > 0) {
    state.activeWorkout.exercises[exIndex].sets = foundEx.sets.map(s => ({
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe || '',
      completed: false
    }));
    DB.saveActiveWorkout();
    renderActiveExercises();
    alert('前回の記録をコピーしました！');
  } else {
    alert('過去の履歴にこの種目の記録が見つかりませんでした。');
  }
}

// Render Active Exercise Blocks
function renderActiveExercises() {
  el.activeExercisesList.innerHTML = '';
  
  if (state.activeWorkout.exercises.length === 0) {
    el.activeExercisesList.innerHTML = `
      <div class="no-data" style="border: 1px dashed rgba(255,255,255,0.08); border-radius:16px;">
        種目が追加されていません。<br>上の「種目を追加」ボタンから筋トレ種目を追加してください。
      </div>
    `;
    return;
  }

  state.activeWorkout.exercises.forEach((ex, exIndex) => {
    const card = document.createElement('div');
    card.className = 'logger-exercise-card';
    
    // Calculate Est 1RM
    const max1RM = getActiveExerciseMax1RM(ex);
    const max1RMText = max1RM > 0 ? `${(Math.round(max1RM * 10) / 10).toFixed(1)} kg` : '-- kg';
    
    // Header layout
    const header = document.createElement('div');
    header.className = 'logger-exercise-header';
    header.innerHTML = `
      <div class="logger-exercise-title-wrap">
        <h4>${ex.emoji ? ex.emoji + ' ' : '💪 '} ${escapeHTML(ex.name)}</h4>
        <div class="logger-exercise-meta-info">
          <span class="est-1rm-badge">Est. 1RM: ${max1RMText}</span>
        </div>
      </div>
      <div class="logger-exercise-actions">
        <button class="btn-icon btn-youtube" data-name="${escapeHTML(ex.name)}" title="フォームをYouTubeで検索">
          <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-youtube"></use></svg>
        </button>
        <button class="btn-icon btn-copy-prev" data-ex-id="${ex.id}" data-idx="${exIndex}" title="前回の記録をコピー">
          <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-copy"></use></svg>
        </button>
        <button class="btn-remove-exercise" data-idx="${exIndex}" title="種目を削除">
          <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
        </button>
      </div>
    `;
    
    // Table list of sets
    const table = document.createElement('table');
    table.className = 'logger-sets-table';
    
    // Table Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 10%">セット</th>
        <th style="width: 30%">重量 (kg)</th>
        <th style="width: 25%">レップ数</th>
        <th style="width: 20%">RPE</th>
        <th style="width: 15%">
          <button type="button" class="btn-check-all-sets" data-ex-idx="${exIndex}" title="一括チェック/解除">
            完了<svg class="icon" style="width:8px; height:8px; margin-left:2px; pointer-events:none;"><use href="#icon-check"></use></svg>
          </button>
        </th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Table Body
    const tbody = document.createElement('tbody');
    ex.sets.forEach((set, setIndex) => {
      const tr = document.createElement('tr');
      tr.className = `set-row ${set.completed ? 'completed-set' : ''}`;
      
      const rpeVal = set.rpe || '';
      
      tr.innerHTML = `
        <td><span class="set-row-num">${setIndex + 1}</span></td>
        <td>
          <div class="set-input-wrap">
            <input type="number" class="set-input weight-input" data-ex-idx="${exIndex}" data-set-idx="${setIndex}" value="${set.weight || ''}" placeholder="--" step="0.5" inputmode="decimal">
            <span class="set-row-unit">kg</span>
          </div>
        </td>
        <td>
          <div class="set-input-wrap">
            <input type="number" class="set-input reps-input" data-ex-idx="${exIndex}" data-set-idx="${setIndex}" value="${set.reps || ''}" placeholder="--" inputmode="numeric">
            <span class="set-row-unit">回</span>
          </div>
        </td>
        <td>
          <div class="set-input-wrap">
            <select class="set-input rpe-select" data-ex-idx="${exIndex}" data-set-idx="${setIndex}">
              <option value="" ${rpeVal === '' ? 'selected' : ''}>--</option>
              ${[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4, 3, 2, 1].map(v => 
                `<option value="${v}" ${rpeVal == v ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
        </td>
        <td>
          <button class="set-check-btn ${set.completed ? 'checked' : ''}" data-ex-idx="${exIndex}" data-set-idx="${setIndex}">
            <svg class="icon"><use href="#icon-check"></use></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    // Add set row button
    const btnAddSet = document.createElement('button');
    btnAddSet.className = 'btn-add-set-row';
    btnAddSet.textContent = '+ セットを追加';
    btnAddSet.addEventListener('click', () => addSetToActiveExercise(exIndex));

    card.appendChild(header);
    card.appendChild(table);
    card.appendChild(btnAddSet);
    
    el.activeExercisesList.appendChild(card);
  });

  // Attach event listeners to newly rendered items
  
  // Weight & Rep Inputs
  document.querySelectorAll('.weight-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIdx = e.target.dataset.exIdx;
      const setIdx = e.target.dataset.setIdx;
      state.activeWorkout.exercises[exIdx].sets[setIdx].weight = parseFloat(e.target.value) || 0;
      DB.saveActiveWorkout();
      renderActiveExercises();
    });
  });

  document.querySelectorAll('.reps-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIdx = e.target.dataset.exIdx;
      const setIdx = e.target.dataset.setIdx;
      state.activeWorkout.exercises[exIdx].sets[setIdx].reps = parseInt(e.target.value, 10) || 0;
      DB.saveActiveWorkout();
      renderActiveExercises();
    });
  });

  // RPE Inputs
  document.querySelectorAll('.rpe-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const exIdx = e.target.dataset.exIdx;
      const setIdx = e.target.dataset.setIdx;
      state.activeWorkout.exercises[exIdx].sets[setIdx].rpe = e.target.value ? parseFloat(e.target.value) : '';
      DB.saveActiveWorkout();
    });
  });

  // YouTube Links
  document.querySelectorAll('.btn-youtube').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.name;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' フォーム')}`, '_blank');
    });
  });

  // Copy Previous Buttons
  document.querySelectorAll('.btn-copy-prev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const exId = e.currentTarget.dataset.exId;
      const exIdx = parseInt(e.currentTarget.dataset.idx, 10);
      copyPreviousWorkoutSets(exId, exIdx);
    });
  });

  // Complete checkboxes
  document.querySelectorAll('.set-check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.set-check-btn');
      const exIdx = targetBtn.dataset.exIdx;
      const setIdx = targetBtn.dataset.setIdx;
      
      const currentStatus = state.activeWorkout.exercises[exIdx].sets[setIdx].completed;
      state.activeWorkout.exercises[exIdx].sets[setIdx].completed = !currentStatus;
      
      // If completed (was turned to true), trigger interval rest timer automatically!
      if (!currentStatus) {
        startRestTimer(state.activeTimer.duration);
      }
      
      DB.saveActiveWorkout();
      renderActiveExercises();
    });
  });
  // Check/Uncheck all sets click
  document.querySelectorAll('.btn-check-all-sets').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-check-all-sets');
      const exIdx = parseInt(targetBtn.dataset.exIdx, 10);
      const exercise = state.activeWorkout.exercises[exIdx];
      
      const allCompleted = exercise.sets.every(s => s.completed);
      exercise.sets.forEach(set => {
        set.completed = !allCompleted;
      });
      
      DB.saveActiveWorkout();
      renderActiveExercises();
    });
  });

  // Remove exercises click
  document.querySelectorAll('.btn-remove-exercise').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-remove-exercise');
      const idx = parseInt(targetBtn.dataset.idx, 10);
      if (confirm(`「${state.activeWorkout.exercises[idx].name}」をトレーニング項目から削除しますか？`)) {
        state.activeWorkout.exercises.splice(idx, 1);
        DB.saveActiveWorkout();
        renderActiveExercises();
      }
    });
  });
}

function addSetToActiveExercise(exIndex) {
  const sets = state.activeWorkout.exercises[exIndex].sets;
  let lastWeight = 0;
  let lastReps = 10;
  let lastRpe = '';
  
  // Autofill values based on previous set
  if (sets.length > 0) {
    lastWeight = sets[sets.length - 1].weight;
    lastReps = sets[sets.length - 1].reps;
    lastRpe = sets[sets.length - 1].rpe || '';
  }
  
  sets.push({
    weight: lastWeight,
    reps: lastReps,
    rpe: lastRpe,
    completed: false
  });
  
  DB.saveActiveWorkout();
  renderActiveExercises();
}

// ----------------------------------------------------
// EXERCISE SELECTOR MODAL IN LOGGER
// ----------------------------------------------------
el.btnAddExercise.addEventListener('click', () => {
  state.exerciseSelectContext = 'activeWorkout';
  renderSelectableExercisesList();
  openModal(el.modalSelectExercise);
});

el.modalSearchInput.addEventListener('input', () => {
  renderSelectableExercisesList();
});

function renderSelectableExercisesList() {
  el.modalExerciseList.innerHTML = '';
  const searchVal = el.modalSearchInput.value.toLowerCase();
  
  const filtered = state.exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchVal) || 
    ex.category.toLowerCase().includes(searchVal)
  );

  if (filtered.length === 0) {
    el.modalExerciseList.innerHTML = '<div class="no-data">見つかりませんでした</div>';
    return;
  }

  // Group by category for visual beauty
  const categories = [...new Set(filtered.map(ex => ex.category))];
  
  categories.forEach(cat => {
    const catHeader = document.createElement('div');
    catHeader.className = 'section-title';
    catHeader.style.marginTop = '12px';
    catHeader.textContent = cat;
    el.modalExerciseList.appendChild(catHeader);
    
    const catItems = filtered.filter(ex => ex.category === cat);
    catItems.forEach(ex => {
      const item = document.createElement('div');
      item.className = 'selectable-item';
      item.innerHTML = `
        <div>
          <h4>${ex.emoji || '💪'} ${escapeHTML(ex.name)}</h4>
        </div>
        <svg class="icon" style="color: var(--primary)"><use href="#icon-chevron-right"></use></svg>
      `;
      
      item.addEventListener('click', () => {
        if (state.exerciseSelectContext === 'editPastWorkout') {
          state.editingPastWorkout.exercises.push({
            id: ex.id,
            name: ex.name,
            category: ex.category,
            sets: [{ weight: 0, reps: 10, rpe: '', completed: true }]
          });
          closeModal(el.modalSelectExercise);
          renderEditPastExercises();
        } else {
          // Add to active workout
          state.activeWorkout.exercises.push({
            id: ex.id,
            name: ex.name,
            category: ex.category,
            sets: [{ weight: 0, reps: 10, completed: false }]
          });
          
          DB.saveActiveWorkout();
          closeModal(el.modalSelectExercise);
          renderActiveExercises();
        }
      });
      
      el.modalExerciseList.appendChild(item);
    });
  });
}

// Cancel Workout Session
el.btnCancelWorkout.addEventListener('click', () => {
  if (confirm('現在のワークアウト記録をすべて破棄しますか？（保存されません）')) {
    state.activeWorkout = null;
    DB.saveActiveWorkout();
    stopSessionTimer();
    navigateTo('dashboard');
  }
});

// Finish Workout Session
el.btnFinishWorkout.addEventListener('click', () => {
  if (!state.activeWorkout) return;
  
  // Filter out exercises with no sets or verify
  const loggedExercises = state.activeWorkout.exercises.filter(ex => ex.sets.length > 0);
  
  if (loggedExercises.length === 0) {
    alert('少なくとも1つ以上の種目とセットを入力・完了してください。');
    return;
  }

  // Confirm completion
  const workoutToSave = {
    id: Date.now().toString(),
    name: state.activeWorkout.name || 'ワークアウト',
    date: new Date().toISOString(),
    durationSeconds: state.activeWorkout.durationSeconds,
    exercises: state.activeWorkout.exercises
  };

  state.workoutHistory.push(workoutToSave);
  state.activeWorkout = null;
  
  DB.saveHistory();
  DB.saveActiveWorkout();
  stopSessionTimer();
  
  alert('ワークアウトを記録しました！お疲れ様でした！ 🌟');
  
  navigateTo('dashboard');
});

// ----------------------------------------------------
// REST INTERVAL TIMER LOGIC & UI
// ----------------------------------------------------
el.btnQuickTimer.addEventListener('click', () => {
  openTimerModal();
});

el.floatingRestTimer.addEventListener('click', () => {
  openTimerModal();
});

function openTimerModal() {
  if (state.activeTimer.remaining === 0) {
    // Reset to default duration if not running
    state.activeTimer.remaining = state.activeTimer.duration;
  }
  updateTimerUI();
  openModal(el.modalTimer);
}

function startRestTimer(seconds) {
  // Clear any existing timer
  if (state.activeTimer.intervalId) {
    clearInterval(state.activeTimer.intervalId);
  }
  
  state.activeTimer.remaining = seconds;
  state.activeTimer.isRunning = true;
  
  updateTimerUI();
  
  state.activeTimer.intervalId = setInterval(() => {
    state.activeTimer.remaining--;
    
    if (state.activeTimer.remaining <= 0) {
      clearInterval(state.activeTimer.intervalId);
      state.activeTimer.intervalId = null;
      state.activeTimer.isRunning = false;
      state.activeTimer.remaining = 0;
      
      // Play Vibrate or Alert sound feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Flash floating badge or display timer finished alert
      alert('インターバル終了！次のセットを開始しましょう！ 🔥');
    }
    
    updateTimerUI();
  }, 1000);
}

function updateTimerUI() {
  const rem = state.activeTimer.remaining;
  const dur = state.activeTimer.duration;
  
  // Format minutes & seconds
  const mins = String(Math.floor(rem / 60)).padStart(2, '0');
  const secs = String(rem % 60).padStart(2, '0');
  const text = `${mins}:${secs}`;
  
  el.timerText.textContent = text;
  el.floatingTimerText.textContent = text;

  // Circle progress calculation (stroke-dasharray="283")
  const dashoffset = rem > 0 ? (1 - (rem / dur)) * 283 : 0;
  el.timerProgressBar.style.strokeDashoffset = dashoffset;

  // Toggle/Pause buttons status
  if (state.activeTimer.isRunning) {
    el.btnTimerToggle.innerHTML = '<svg class="icon"><use href="#icon-pause"></use></svg> 一時停止';
    el.btnTimerToggle.className = 'btn btn-primary';
    el.floatingRestTimer.style.display = 'flex';
  } else {
    el.btnTimerToggle.innerHTML = '<svg class="icon"><use href="#icon-play"></use></svg> 再開';
    el.btnTimerToggle.className = 'btn btn-success';
    el.floatingRestTimer.style.display = rem > 0 ? 'flex' : 'none';
  }
}

// Timer preset button clicks
document.querySelectorAll('.timer-preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const addSecs = parseInt(e.target.dataset.seconds, 10);
    
    if (state.activeTimer.isRunning) {
      startRestTimer(state.activeTimer.remaining + addSecs);
    } else {
      state.activeTimer.duration = addSecs; // reset default
      startRestTimer(addSecs);
    }
  });
});

// Play/Pause button
el.btnTimerToggle.addEventListener('click', () => {
  if (state.activeTimer.isRunning) {
    // Pause
    clearInterval(state.activeTimer.intervalId);
    state.activeTimer.intervalId = null;
    state.activeTimer.isRunning = false;
    updateTimerUI();
  } else {
    // Resume
    if (state.activeTimer.remaining === 0) {
      state.activeTimer.remaining = state.activeTimer.duration;
    }
    startRestTimer(state.activeTimer.remaining);
  }
});

// Reset timer button
el.btnTimerReset.addEventListener('click', () => {
  clearInterval(state.activeTimer.intervalId);
  state.activeTimer.intervalId = null;
  state.activeTimer.isRunning = false;
  state.activeTimer.remaining = state.activeTimer.duration;
  updateTimerUI();
});

// ----------------------------------------------------
// SCREEN 3: HISTORY SCREEN CONTROLLER
// ----------------------------------------------------
function switchHistoryTab(tabId) {
  state.selectedHistoryTab = tabId;
  
  if (tabId === 'logs') {
    el.btnHistoryLogs.classList.add('active');
    el.btnHistoryStats.classList.remove('active');
    el.panelHistoryLogs.classList.add('active');
    el.panelHistoryStats.classList.remove('active');
  } else {
    el.btnHistoryLogs.classList.remove('active');
    el.btnHistoryStats.classList.add('active');
    el.panelHistoryLogs.classList.remove('active');
    el.panelHistoryStats.classList.add('active');
    populate1RMExerciseSelect();
    renderStatsChart();
    render1RMChart(state.selectedChartExerciseId);
  }
}

el.btnHistoryLogs.addEventListener('click', () => switchHistoryTab('logs'));
el.btnHistoryStats.addEventListener('click', () => switchHistoryTab('stats'));

function renderHistory() {
  el.historyList.innerHTML = '';
  
  if (state.workoutHistory.length === 0) {
    el.historyList.innerHTML = '<div class="no-data">トレーニング履歴がまだありません</div>';
    return;
  }

  // Sort logs by date descending
  const sortedLogs = [...state.workoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedLogs.forEach(log => {
    const card = document.createElement('div');
    card.className = 'glass-card history-card';
    
    // Calculate total sets & volume
    let totalVol = 0;
    let totalSets = 0;
    log.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          totalVol += (Number(set.weight) || 0) * (Number(set.reps) || 0);
          totalSets++;
        }
      });
    });

    const date = new Date(log.date);
    const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    // Render exercises breakdown
    let exercisesHTML = '';
    log.exercises.forEach(ex => {
      // Treat as completed if completed is true or undefined (fallback for backwards compatibility)
      const completedSets = ex.sets.filter(s => s.completed !== false);
      if (completedSets.length === 0) return;

      const bestSet = completedSets.reduce((max, s) => s.weight > max.weight ? s : max, { weight: 0, reps: 0 });
      
      const setsDetails = completedSets.map(s => {
        const rpeText = s.rpe ? `@${s.rpe}` : '';
        return `${s.weight}kg×${s.reps}回${rpeText}`;
      }).join(', ');

      const max1RM = getActiveExerciseMax1RM(ex);
      const max1RMText = max1RM > 0 ? ` (Est. 1RM: ${(Math.round(max1RM * 10) / 10).toFixed(1)}kg)` : '';

      exercisesHTML += `
        <div class="history-card-exercise-item">
          <strong>${escapeHTML(ex.name)}</strong>
          <span class="history-card-set-summary">
            (${completedSets.length}セット • ${setsDetails}${max1RMText})
          </span>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="history-card-header">
        <div class="history-card-title">
          <h4>${escapeHTML(log.name)}</h4>
          <span class="history-card-date">${dateStr} ${timeStr}</span>
        </div>
        <div class="history-card-total-vol">
          ${totalVol.toLocaleString()} kg
        </div>
      </div>
      <div class="history-card-exercises">
        ${exercisesHTML}
      </div>
      <div class="history-card-actions">
        <button class="btn-history-action btn-repeat-workout" data-log-id="${log.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-play"></use></svg>この内容で開始
        </button>
        <button class="btn-history-action btn-routine-workout" data-log-id="${log.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-copy"></use></svg>ルーティン化
        </button>
        <button class="btn-history-action btn-edit-workout" data-log-id="${log.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg>編集
        </button>
        <button class="btn-history-action btn-delete-workout" data-log-id="${log.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>削除
        </button>
      </div>
    `;

    el.historyList.appendChild(card);
  });

  // Attach button events
  document.querySelectorAll('.btn-repeat-workout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-repeat-workout');
      const logId = targetBtn.dataset.logId;
      repeatWorkoutFromPastLog(logId);
    });
  });

  document.querySelectorAll('.btn-routine-workout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-routine-workout');
      const logId = targetBtn.dataset.logId;
      createRoutineFromPastLog(logId);
    });
  });

  document.querySelectorAll('.btn-edit-workout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-edit-workout');
      const logId = targetBtn.dataset.logId;
      openEditPastWorkoutModal(logId);
    });
  });

  document.querySelectorAll('.btn-delete-workout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-delete-workout');
      const logId = targetBtn.dataset.logId;
      if (confirm('このトレーニング記録を履歴から完全に削除しますか？')) {
        state.workoutHistory = state.workoutHistory.filter(w => w.id !== logId);
        DB.saveHistory();
        renderHistory();
        renderDashboard();
      }
    });
  });
}

function renderStatsChart() {
  // Lifetime stats calculations
  let alltimeVol = 0;
  state.workoutHistory.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          alltimeVol += (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }
      });
    });
  });

  el.statAlltimeCount.textContent = state.workoutHistory.length;
  el.statAlltimeVolume.textContent = alltimeVol.toLocaleString();

  // SVG Chart rendering
  // Take last 7 workouts in chronological order
  const chartLogs = [...state.workoutHistory]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  if (chartLogs.length < 2) {
    el.volumeChartSvg.innerHTML = `
      <text x="175" y="100" fill="var(--text-muted)" text-anchor="middle" font-size="12">
        グラフを描画するには、少なくとも2回以上の記録が必要です。
      </text>
    `;
    return;
  }

  // Calculate volumes
  const volumes = chartLogs.map(log => {
    let vol = 0;
    log.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          vol += (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }
      });
    });
    return vol;
  });

  const maxVol = Math.max(...volumes, 500); // minimum scale limit
  const minVol = 0;

  // Chart config
  const w = 350;
  const h = 200;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = w - 2 * paddingX;
  const graphHeight = h - 2 * paddingY;

  // Map to SVG coordinates
  const points = volumes.map((vol, index) => {
    const x = paddingX + (index * (graphWidth / (volumes.length - 1)));
    // Invert Y because SVG 0,0 is top-left
    const y = h - paddingY - ((vol - minVol) / (maxVol - minVol)) * graphHeight;
    return { x, y, val: vol, date: new Date(chartLogs[index].date) };
  });

  // Create SVG path string
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  // Reference lines & labels
  let gridLines = '';
  // Horizontal grid lines
  const gridCount = 3;
  for (let i = 0; i <= gridCount; i++) {
    const val = minVol + (i * (maxVol - minVol) / gridCount);
    const y = h - paddingY - (i * graphHeight / gridCount);
    
    gridLines += `
      <line x1="${paddingX}" y1="${y}" x2="${w - paddingX}" y2="${y}" class="chart-grid-line" />
      <text x="${paddingX - 8}" y="${y + 3}" fill="var(--text-muted)" font-size="7" text-anchor="end">${Math.round(val)}</text>
    `;
  }

  // Points & Labels & Dates
  let pointsHTML = '';
  points.forEach((pt, index) => {
    const dateStr = pt.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    pointsHTML += `
      <!-- Circles for points -->
      <circle cx="${pt.x}" cy="${pt.y}" r="4" class="chart-point" />
      
      <!-- Values on points -->
      <text x="${pt.x}" y="${pt.y - 8}" class="chart-label" font-size="7" font-weight="bold">${pt.val.toLocaleString()}</text>
      
      <!-- Date axis label -->
      <text x="${pt.x}" y="${h - paddingY + 12}" fill="var(--text-muted)" font-size="7" text-anchor="middle">${dateStr}</text>
    `;
  });

  el.volumeChartSvg.innerHTML = `
    ${gridLines}
    <path d="${pathD}" class="chart-line" />
    ${pointsHTML}
  `;
}

// ----------------------------------------------------
// SCREEN 4: EXERCISE MASTER SCREEN CONTROLLER
// ----------------------------------------------------
function renderExercises() {
  renderCategoryFilters();
  renderMasterExerciseList();
}

function renderCategoryFilters() {
  el.exerciseCategoryFilters.innerHTML = '';
  
  // Unique categories in exercise master
  const categories = ['すべて', ...new Set(state.exercises.map(ex => ex.category))];
  
  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `filter-chip ${state.selectedExerciseFilter === cat ? 'active' : ''}`;
    chip.textContent = cat;
    
    chip.addEventListener('click', () => {
      state.selectedExerciseFilter = cat;
      renderExercises();
    });
    
    el.exerciseCategoryFilters.appendChild(chip);
  });
}

function renderMasterExerciseList() {
  el.exerciseMasterList.innerHTML = '';
  const searchVal = el.inputSearchExercise.value.toLowerCase();
  
  let filtered = state.exercises;
  
  // Category Filter
  if (state.selectedExerciseFilter !== 'すべて') {
    filtered = filtered.filter(ex => ex.category === state.selectedExerciseFilter);
  }
  
  // Search Filter
  if (searchVal) {
    filtered = filtered.filter(ex => 
      ex.name.toLowerCase().includes(searchVal) || 
      ex.category.toLowerCase().includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    el.exerciseMasterList.innerHTML = '<div class="no-data">該当する種目がありません</div>';
    return;
  }

  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'glass-card exercise-master-item';
    
    // Check if it is a custom exercise that can be deleted
    // Non-custom defaults have simple numeric IDs '1' through '16'
    const isCustom = isNaN(ex.id) || parseInt(ex.id, 10) > 16;
    let deleteHTML = '';
    
    if (isCustom) {
      deleteHTML = `
        <button class="btn-exercise-delete" data-ex-id="${ex.id}" title="カスタム種目を削除">
          <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="exercise-master-info">
        <h4>${ex.emoji || '💪'} ${escapeHTML(ex.name)}</h4>
        <span class="exercise-master-category">${escapeHTML(ex.category)}</span>
      </div>
      ${deleteHTML}
    `;

    el.exerciseMasterList.appendChild(card);
  });

  // Attach delete listeners
  document.querySelectorAll('.exercise-master-list .btn-exercise-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-exercise-delete');
      const exId = targetBtn.dataset.exId;
      const exObj = state.exercises.find(ex => ex.id === exId);
      
      if (confirm(`カスタム種目「${exObj.name}」を削除しますか？`)) {
        state.exercises = state.exercises.filter(ex => ex.id !== exId);
        DB.saveExercises();
        renderExercises();
      }
    });
  });
}

el.inputSearchExercise.addEventListener('input', () => {
  renderMasterExerciseList();
});

// Custom exercise creation modal trigger
el.btnNewExercise.addEventListener('click', () => {
  el.inputNewExerciseName.value = '';
  openModal(el.modalCreateExercise);
});

// Custom exercise submit handler
el.formCreateExercise.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = el.inputNewExerciseName.value.trim();
  const category = el.selectNewExerciseCategory.value;
  
  if (!name) return;

  const categoryEmojis = {
    '胸': '💪',
    '背中': '🚣‍♂️',
    '脚': '🦵',
    '肩': '🏋️‍♂️',
    '腕': '💪',
    '腹筋': '🧘',
    'その他': '🏋️'
  };

  const newEx = {
    id: Date.now().toString(),
    name: name,
    category: category,
    emoji: categoryEmojis[category] || '💪'
  };

  state.exercises.push(newEx);
  DB.saveExercises();
  
  closeModal(el.modalCreateExercise);
  renderExercises();
  
  alert(`カスタム種目「${name}」を追加しました！`);
});

// ----------------------------------------------------
// SCREEN 4: MEALS & BODY METRICS (NEW)
// ----------------------------------------------------

function renderBodyScreen() {
  if (state.selectedBodyTab === 'meals') {
    el.btnBodyMeals.classList.add('active');
    el.btnBodyMetrics.classList.remove('active');
    el.panelBodyMeals.classList.add('active');
    el.panelBodyMetrics.classList.remove('active');
    renderMeals();
  } else {
    el.btnBodyMeals.classList.remove('active');
    el.btnBodyMetrics.classList.add('active');
    el.panelBodyMeals.classList.remove('active');
    el.panelBodyMetrics.classList.add('active');
    renderBodyMetrics();
  }
}

// Bind segment controls
el.btnBodyMeals.addEventListener('click', () => {
  state.selectedBodyTab = 'meals';
  renderBodyScreen();
});
el.btnBodyMetrics.addEventListener('click', () => {
  state.selectedBodyTab = 'metrics';
  renderBodyScreen();
});

// Bind add buttons to modals
el.btnAddMeal.addEventListener('click', () => {
  el.inputMealMemo.value = '';
  el.inputMealCalories.value = '';
  el.selectMealType.value = '朝食';
  if (el.inputMealImage) el.inputMealImage.value = '';
  if (el.imgMealPreview) el.imgMealPreview.src = '';
  if (el.mealImagePreview) el.mealImagePreview.style.display = 'none';
  openModal(el.modalCreateMeal);
});

el.btnAddMetric.addEventListener('click', () => {
  el.inputMetricWeight.value = '';
  el.inputMetricFat.value = '';
  el.inputMetricMuscle.value = '';
  openModal(el.modalCreateMetric);
});

// ----------------------------------------------------
// MEALS TIMELINE LOGIC
// ----------------------------------------------------

function renderMeals() {
  el.mealsTimelineList.innerHTML = '';
  
  // Get today's local date string: YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  
  // Filter meals for today
  const todayMeals = state.meals.filter(meal => {
    const mealDate = new Date(meal.date);
    const mealDateStr = mealDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    return mealDateStr === todayStr;
  });
  
  // Sort today's meals by time (chronological)
  todayMeals.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate total calories for today
  const totalCalories = todayMeals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
  el.mealTodayCalories.textContent = `${totalCalories.toLocaleString()} kcal`;
  
  if (todayMeals.length === 0) {
    el.mealsTimelineList.innerHTML = '<div class="no-data">今日の食事記録はありません</div>';
    return;
  }
  
  todayMeals.forEach(meal => {
    const item = document.createElement('div');
    item.className = 'meal-timeline-item';
    
    // Type classes: breakfast, lunch, dinner, snack
    let typeClass = 'snack';
    if (meal.type === '朝食') typeClass = 'breakfast';
    else if (meal.type === '昼食') typeClass = 'lunch';
    else if (meal.type === '夕食') typeClass = 'dinner';
    
    const timeStr = new Date(meal.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    let photoHTML = '';
    if (meal.image && meal.image.startsWith('data:image')) {
      photoHTML = `<img src="${meal.image}" class="meal-photo" style="margin-right: 12px;">`;
    } else {
      let emoji = '🍌';
      if (meal.type === '朝食') emoji = '🍳';
      else if (meal.type === '昼食') emoji = '🍱';
      else if (meal.type === '夕食') emoji = '🥩';
      photoHTML = `<div class="meal-photo-emoji" style="margin-right: 12px;">${emoji}</div>`;
    }

    item.innerHTML = `
      <div class="meal-timeline-dot ${typeClass}"></div>
      <div class="glass-card meal-card" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; flex: 1;">
          ${photoHTML}
          <div class="meal-info">
            <h4>${escapeHTML(meal.memo)}</h4>
            <p>
              <span class="meal-time-badge">${timeStr}</span>
              <span class="meal-type-badge ${typeClass}">${escapeHTML(meal.type)}</span>
            </p>
          </div>
        </div>
        <div style="display: flex; align-items: center;">
          <span class="meal-calories">${Number(meal.calories).toLocaleString()} <span style="font-size:0.7rem; color:var(--text-muted)">kcal</span></span>
          <button class="meal-delete-btn" data-meal-id="${meal.id}" title="削除">
            <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      </div>
    `;
    
    el.mealsTimelineList.appendChild(item);
  });
  
  // Add deletion listeners
  document.querySelectorAll('.meal-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.meal-delete-btn');
      const mealId = targetBtn.dataset.mealId;
      if (confirm('この食事記録を削除しますか？')) {
        state.meals = state.meals.filter(m => m.id !== mealId);
        DB.saveMeals();
        renderMeals();
      }
    });
  });
}

// Meal submit handler
el.formCreateMeal.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const type = el.selectMealType.value;
  const memo = el.inputMealMemo.value.trim();
  const calories = parseInt(el.inputMealCalories.value, 10);
  const image = el.imgMealPreview.src || null;
  
  if (!memo || isNaN(calories)) return;
  
  const newMeal = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type: type,
    memo: memo,
    calories: calories,
    image: image
  };
  
  state.meals.push(newMeal);
  DB.saveMeals();
  
  closeModal(el.modalCreateMeal);
  renderMeals();
  renderDashboard();
});

// ----------------------------------------------------
// BODY METRICS & DUAL-AXIS CHART LOGIC
// ----------------------------------------------------

function renderBodyMetrics() {
  el.metricsHistoryList.innerHTML = '';
  
  if (state.bodyMetrics.length === 0) {
    el.metricCurrWeight.textContent = '--';
    el.metricCurrFat.textContent = '--';
    el.metricsHistoryList.innerHTML = '<div class="no-data">測定履歴がありません。上の「記録」ボタンから体重・体脂肪率を入力してください。</div>';
    
    // Clear SVG chart
    el.metricsChartSvg.innerHTML = `
      <text x="175" y="100" fill="var(--text-muted)" text-anchor="middle" font-size="12">
        グラフを描画するには、測定データが必要です。
      </text>
    `;
    return;
  }
  
  // Sort metrics by date descending
  const sortedMetrics = [...state.bodyMetrics].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Set current indicators from latest entry
  const latest = sortedMetrics[0];
  el.metricCurrWeight.textContent = latest.weight.toFixed(1);
  el.metricCurrFat.textContent = latest.fat ? latest.fat.toFixed(1) : '--';
  
  // Render history list
  sortedMetrics.forEach(m => {
    const item = document.createElement('div');
    item.className = 'glass-card metric-history-item';
    
    const date = new Date(m.date);
    const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    const muscleText = m.muscle ? ` • 筋肉量: ${m.muscle.toFixed(1)}kg` : '';
    
    item.innerHTML = `
      <div class="metric-history-info">
        <span class="metric-history-date">${dateStr} ${timeStr}</span>
        <span class="metric-history-details">骨格筋量: ${m.muscle ? m.muscle.toFixed(1) + 'kg' : '--'}</span>
      </div>
      <div class="metric-history-values">
        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <span class="metric-val-weight">${m.weight.toFixed(1)} <span style="font-size:0.7rem; color:var(--text-muted)">kg</span></span>
          ${m.fat ? `<span class="metric-val-fat">${m.fat.toFixed(1)} <span style="font-size:0.65rem; color:var(--text-muted)">%</span></span>` : ''}
        </div>
        <button class="meal-delete-btn btn-metric-delete" data-metric-id="${m.id}" title="削除">
          <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
        </button>
      </div>
    `;
    el.metricsHistoryList.appendChild(item);
  });
  
  // Add deletion listeners
  document.querySelectorAll('.btn-metric-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-metric-delete');
      const metricId = targetBtn.dataset.metricId;
      if (confirm('この測定記録を削除しますか？')) {
        state.bodyMetrics = state.bodyMetrics.filter(m => m.id !== metricId);
        DB.saveBodyMetrics();
        renderBodyMetrics();
      }
    });
  });
  
  // Render Chart
  renderMetricsChart();
}

function renderMetricsChart() {
  const chartMetrics = [...state.bodyMetrics]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);
    
  if (chartMetrics.length < 2) {
    el.metricsChartSvg.innerHTML = `
      <text x="175" y="100" fill="var(--text-muted)" text-anchor="middle" font-size="12">
        グラフを描画するには、少なくとも2回以上の記録が必要です。
      </text>
    `;
    return;
  }
  
  // Weight & Fat list
  const weights = chartMetrics.map(m => m.weight);
  const fats = chartMetrics.map(m => m.fat || 0); // fallback if no fat%
  
  // Find min/max weight and fat%
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const weightSpan = maxWeight - minWeight;
  const weightPad = weightSpan > 0 ? weightSpan * 0.15 : 2; // minimum padding of 2kg
  const wMax = maxWeight + weightPad;
  const wMin = Math.max(0, minWeight - weightPad);
  
  const activeFats = fats.filter(f => f > 0);
  const maxFat = activeFats.length > 0 ? Math.max(...activeFats) : 25;
  const minFat = activeFats.length > 0 ? Math.min(...activeFats) : 10;
  const fatSpan = maxFat - minFat;
  const fatPad = fatSpan > 0 ? fatSpan * 0.15 : 2; // minimum padding of 2%
  const fMax = maxFat + fatPad;
  const fMin = Math.max(0, minFat - fatPad);
  
  // Chart dimensions
  const w = 350;
  const h = 200;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = w - 2 * paddingX;
  const graphHeight = h - 2 * paddingY;
  
  // Coordinates mapping
  const weightPts = chartMetrics.map((m, idx) => {
    const x = paddingX + (idx * (graphWidth / (chartMetrics.length - 1)));
    const y = h - paddingY - ((m.weight - wMin) / (wMax - wMin)) * graphHeight;
    return { x, y, val: m.weight };
  });
  
  const fatPts = chartMetrics.map((m, idx) => {
    const x = paddingX + (idx * (graphWidth / (chartMetrics.length - 1)));
    // Fat could be null or undefined
    const hasFat = m.fat !== null && m.fat !== undefined && m.fat > 0;
    const y = hasFat ? (h - paddingY - ((m.fat - fMin) / (fMax - fMin)) * graphHeight) : null;
    return { x, y, val: m.fat };
  });
  
  // SVG strings
  let weightPathD = `M ${weightPts[0].x} ${weightPts[0].y}`;
  for (let i = 1; i < weightPts.length; i++) {
    weightPathD += ` L ${weightPts[i].x} ${weightPts[i].y}`;
  }
  
  let fatPathD = '';
  const validFatPts = fatPts.filter(pt => pt.y !== null);
  if (validFatPts.length >= 2) {
    fatPathD = `M ${validFatPts[0].x} ${validFatPts[0].y}`;
    for (let i = 1; i < validFatPts.length; i++) {
      fatPathD += ` L ${validFatPts[i].x} ${validFatPts[i].y}`;
    }
  }
  
  // Grid lines
  let gridHTML = '';
  const gridCount = 3;
  for (let i = 0; i <= gridCount; i++) {
    const y = h - paddingY - (i * graphHeight / gridCount);
    
    // Left axis (Weight) labels
    const weightVal = wMin + (i * (wMax - wMin) / gridCount);
    // Right axis (Fat %) labels
    const fatVal = fMin + (i * (fMax - fMin) / gridCount);
    
    gridHTML += `
      <line x1="${paddingX}" y1="${y}" x2="${w - paddingX}" y2="${y}" class="chart-grid-line" />
      <!-- Left axis label -->
      <text x="${paddingX - 8}" y="${y + 3}" fill="var(--text-secondary)" font-size="7" text-anchor="end">${weightVal.toFixed(1)}kg</text>
      <!-- Right axis label -->
      <text x="${w - paddingX + 8}" y="${y + 3}" fill="var(--warning)" font-size="7" text-anchor="start">${fatVal.toFixed(1)}%</text>
    `;
  }

  // Weight lines/points
  let weightHTML = `<path d="${weightPathD}" class="chart-line" />`;
  weightPts.forEach(pt => {
    weightHTML += `
      <circle cx="${pt.x}" cy="${pt.y}" r="3.5" class="chart-point" />
      <text x="${pt.x}" y="${pt.y - 7}" class="chart-label" font-size="6.5" font-weight="bold">${pt.val.toFixed(1)}</text>
    `;
  });

  // Fat lines/points
  let fatHTML = '';
  if (fatPathD) {
    fatHTML = `<path d="${fatPathD}" class="chart-line-fat" />`;
  }
  fatPts.forEach(pt => {
    if (pt.y !== null) {
      fatHTML += `
        <circle cx="${pt.x}" cy="${pt.y}" r="3.5" class="chart-point-fat" />
        <text x="${pt.x}" y="${pt.y + 11}" class="chart-label" font-size="6.5" font-weight="bold" fill="var(--warning)">${pt.val.toFixed(1)}%</text>
      `;
    }
  });

  // X axis date labels
  let dateLabelsHTML = '';
  chartMetrics.forEach((m, idx) => {
    const x = paddingX + (idx * (graphWidth / (chartMetrics.length - 1)));
    const dateStr = new Date(m.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    dateLabelsHTML += `
      <text x="${x}" y="${h - paddingY + 12}" fill="var(--text-muted)" font-size="7" text-anchor="middle">${dateStr}</text>
    `;
  });

  el.metricsChartSvg.innerHTML = `
    ${gridHTML}
    ${weightHTML}
    ${fatHTML}
    ${dateLabelsHTML}
  `;
}

// Metric submit handler
el.formCreateMetric.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const weight = parseFloat(el.inputMetricWeight.value);
  const fatVal = el.inputMetricFat.value;
  const fat = fatVal ? parseFloat(fatVal) : null;
  const muscleVal = el.inputMetricMuscle.value;
  const muscle = muscleVal ? parseFloat(muscleVal) : null;
  
  if (isNaN(weight)) return;
  
  const newMetric = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    weight: weight,
    fat: fat,
    muscle: muscle
  };
  
  state.bodyMetrics.push(newMetric);
  DB.saveBodyMetrics();
  
  closeModal(el.modalCreateMetric);
  renderBodyMetrics();
});

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ----------------------------------------------------
// CALENDAR & ROUTINES & 1RM GRAPH GENERATOR IMPLEMENTATION
// ----------------------------------------------------

function renderCalendar() {
  if (!el.dashboardCalendar) return;
  el.dashboardCalendar.innerHTML = '';

  const year = state.calendarYear;
  const month = state.calendarMonth;
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Create header controls for changing month
  const headerControls = document.createElement('div');
  headerControls.className = 'calendar-header-controls';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-calendar-nav';
  prevBtn.innerHTML = '<svg class="icon" style="width: 16px; height: 16px;"><use href="#icon-chevron-left"></use></svg>';
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.calendarMonth--;
    if (state.calendarMonth < 0) {
      state.calendarMonth = 11;
      state.calendarYear--;
    }
    renderCalendar();
  });

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const monthTitle = document.createElement('div');
  monthTitle.className = 'calendar-month-title';
  monthTitle.textContent = `${year}年 ${monthNames[month]}`;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-calendar-nav';
  nextBtn.innerHTML = '<svg class="icon" style="width: 16px; height: 16px;"><use href="#icon-chevron-right"></use></svg>';
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.calendarMonth++;
    if (state.calendarMonth > 11) {
      state.calendarMonth = 0;
      state.calendarYear++;
    }
    renderCalendar();
  });

  headerControls.appendChild(prevBtn);
  headerControls.appendChild(monthTitle);
  headerControls.appendChild(nextBtn);
  el.dashboardCalendar.appendChild(headerControls);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
  dayHeaders.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-header-day';
    dayEl.textContent = day;
    grid.appendChild(dayEl);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'calendar-day empty';
    grid.appendChild(emptyEl);
  }

  const workoutDates = new Set();
  state.workoutHistory.forEach(w => {
    const wDate = new Date(w.date);
    if (wDate.getFullYear() === year && wDate.getMonth() === month) {
      workoutDates.add(wDate.getDate());
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = d;

    if (d === todayDate && year === todayYear && month === todayMonth) {
      dayEl.classList.add('today');
    }

    if (workoutDates.has(d)) {
      dayEl.classList.add('active-workout');
      const stampEl = document.createElement('span');
      stampEl.className = 'calendar-day-stamp';
      stampEl.textContent = d % 2 === 0 ? '💪' : '🔥';
      dayEl.appendChild(stampEl);
    }

    dayEl.addEventListener('click', () => {
      openCalendarDayDetailModal(year, month, d);
    });

    grid.appendChild(dayEl);
  }

  el.dashboardCalendar.appendChild(grid);
}

function openCalendarDayDetailModal(year, month, day) {
  if (!el.modalCalendarDayDetail || !el.calendarDayDetailTitle || !el.calendarDayDetailContent) return;

  const dateStr = `${year}年${month + 1}月${day}日`;
  el.calendarDayDetailTitle.textContent = `${dateStr} のトレーニング`;

  const dayWorkouts = state.workoutHistory.filter(w => {
    const d = new Date(w.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  el.calendarDayDetailContent.innerHTML = '';

  if (dayWorkouts.length === 0) {
    el.calendarDayDetailContent.innerHTML = `
      <div style="text-align: center; padding: 24px 12px;">
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">この日のトレーニング記録はありません。</p>
        <button id="btn-calendar-start-new" class="btn btn-primary" style="margin: 0 auto;">
          <svg class="icon" style="width:16px; height:16px; margin-right:4px;"><use href="#icon-plus"></use></svg>新規ワークアウトを開始
        </button>
      </div>
    `;
    
    document.getElementById('btn-calendar-start-new').addEventListener('click', () => {
      closeModal(el.modalCalendarDayDetail);
      navigateTo('logger');
      if (!state.activeWorkout) {
        startNewWorkoutSession();
      }
    });
  } else {
    dayWorkouts.forEach(log => {
      const card = document.createElement('div');
      card.className = 'glass-card history-card';
      card.style.marginBottom = '12px';
      
      // Calculate total sets & volume
      let totalVol = 0;
      let totalSets = 0;
      log.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed) {
            totalVol += (Number(set.weight) || 0) * (Number(set.reps) || 0);
            totalSets++;
          }
        });
      });

      const date = new Date(log.date);
      const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

      // Render exercises breakdown
      let exercisesHTML = '';
      log.exercises.forEach(ex => {
        const completedSets = ex.sets.filter(s => s.completed !== false);
        if (completedSets.length === 0) return;

        const setsDetails = completedSets.map(s => {
          const rpeText = s.rpe ? `@${s.rpe}` : '';
          return `${s.weight}kg×${s.reps}回${rpeText}`;
        }).join(', ');

        const max1RM = getActiveExerciseMax1RM(ex);
        const max1RMText = max1RM > 0 ? ` (Est. 1RM: ${(Math.round(max1RM * 10) / 10).toFixed(1)}kg)` : '';

        exercisesHTML += `
          <div class="history-card-exercise-item">
            <strong>${escapeHTML(ex.name)}</strong>
            <span class="history-card-set-summary">
              (${completedSets.length}セット • ${setsDetails}${max1RMText})
            </span>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="history-card-header">
          <div class="history-card-title">
            <h4>${escapeHTML(log.name)}</h4>
            <span class="history-card-date">${timeStr} 開始</span>
          </div>
          <div class="history-card-total-vol">
            ${totalVol.toLocaleString()} kg
          </div>
        </div>
        <div class="history-card-exercises">
          ${exercisesHTML}
        </div>
        <div class="history-card-actions">
          <button class="btn-history-action btn-calendar-repeat" data-log-id="${log.id}">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-play"></use></svg>この内容で開始
          </button>
          <button class="btn-history-action btn-calendar-routine" data-log-id="${log.id}">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-copy"></use></svg>ルーティン化
          </button>
          <button class="btn-history-action btn-calendar-edit" data-log-id="${log.id}">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-edit"></use></svg>編集
          </button>
          <button class="btn-history-action btn-calendar-delete" data-log-id="${log.id}">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>削除
          </button>
        </div>
      `;

      el.calendarDayDetailContent.appendChild(card);
    });

    // Attach actions
    el.calendarDayDetailContent.querySelectorAll('.btn-calendar-repeat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = e.currentTarget.dataset.logId;
        closeModal(el.modalCalendarDayDetail);
        repeatWorkoutFromPastLog(logId);
      });
    });

    el.calendarDayDetailContent.querySelectorAll('.btn-calendar-routine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = e.currentTarget.dataset.logId;
        closeModal(el.modalCalendarDayDetail);
        createRoutineFromPastLog(logId);
      });
    });

    el.calendarDayDetailContent.querySelectorAll('.btn-calendar-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = e.currentTarget.dataset.logId;
        closeModal(el.modalCalendarDayDetail);
        openEditPastWorkoutModal(logId);
      });
    });

    el.calendarDayDetailContent.querySelectorAll('.btn-calendar-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = e.currentTarget.dataset.logId;
        if (confirm('このトレーニング記録を履歴から完全に削除しますか？')) {
          state.workoutHistory = state.workoutHistory.filter(w => w.id !== logId);
          DB.saveHistory();
          openCalendarDayDetailModal(year, month, day); // refresh this modal
          renderHistory(); // refresh history tab
          renderDashboard(); // refresh dashboard calendar/recent
        }
      });
    });
  }

  openModal(el.modalCalendarDayDetail);
}

function renderRoutines() {
  if (!el.recommendedRoutinesList || !el.customRoutinesList) return;

  el.recommendedRoutinesList.innerHTML = '';
  RECOMMENDED_ROUTINES.forEach(routine => {
    const card = document.createElement('div');
    card.className = 'routine-card';
    card.innerHTML = `
      <div>
        <div class="routine-title">${escapeHTML(routine.name)}</div>
        <div class="routine-meta">
          <svg class="icon" style="width: 12px; height: 12px;"><use href="#icon-dumbbell"></use></svg>
          ${routine.exercises.length} 種目
        </div>
      </div>
    `;
    card.addEventListener('click', () => {
      startNewWorkoutSession(routine.name, routine.exercises);
    });
    el.recommendedRoutinesList.appendChild(card);
  });

  el.customRoutinesList.innerHTML = '';
  if (state.routines.length === 0) {
    el.customRoutinesList.innerHTML = `
      <div class="no-data" style="grid-column: span 2; padding: 20px 0; font-size: 0.8rem;">
        カスタムルーティンはまだありません。<br>「作成」ボタンから独自のルーティンを作成できます。
      </div>
    `;
  } else {
    state.routines.forEach((routine, idx) => {
      const card = document.createElement('div');
      card.className = 'routine-card';
      
      card.innerHTML = `
        <div>
          <div class="routine-title">${escapeHTML(routine.name)}</div>
          <div class="routine-meta">
            <svg class="icon" style="width: 12px; height: 12px;"><use href="#icon-dumbbell"></use></svg>
            ${routine.exercises.length} 種目
          </div>
        </div>
        <div class="routine-actions">
          <button class="btn-routine-delete btn-exercise-delete" data-idx="${idx}" title="ルーティンを削除">
            <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      `;
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-routine-delete')) return;
        startNewWorkoutSession(routine.name, routine.exercises);
      });
      
      el.customRoutinesList.appendChild(card);
    });

    document.querySelectorAll('.btn-routine-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        const name = state.routines[idx].name;
        if (confirm(`カスタムルーティン「${name}」を削除しますか？`)) {
          state.routines.splice(idx, 1);
          DB.saveRoutines();
          renderRoutines();
        }
      });
    });
  }
}

el.btnCreateRoutine.addEventListener('click', () => {
  el.inputRoutineName.value = '';
  renderRoutineExercisesCheckboxes();
  openModal(el.modalCreateRoutine);
});

function renderRoutineExercisesCheckboxes(checkedIds = []) {
  if (!el.routineExercisesCheckboxes) return;
  el.routineExercisesCheckboxes.innerHTML = '';

  state.exercises.forEach(ex => {
    const label = document.createElement('label');
    const isChecked = checkedIds.includes(ex.id) ? 'checked' : '';
    label.innerHTML = `
      <input type="checkbox" name="routine-exercise" value="${ex.id}" ${isChecked}>
      <span>${ex.emoji || '💪'} ${escapeHTML(ex.name)}</span>
    `;
    el.routineExercisesCheckboxes.appendChild(label);
  });
}

el.formCreateRoutine.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = el.inputRoutineName.value.trim();
  if (!name) return;

  const checkedBoxes = document.querySelectorAll('input[name="routine-exercise"]:checked');
  const exerciseIds = Array.from(checkedBoxes).map(cb => cb.value);

  if (exerciseIds.length === 0) {
    alert('少なくとも1つ以上の種目を選択してください。');
    return;
  }

  const newRoutine = {
    id: Date.now().toString(),
    name: name,
    exercises: exerciseIds
  };

  state.routines.push(newRoutine);
  DB.saveRoutines();

  closeModal(el.modalCreateRoutine);
  renderRoutines();
  alert(`カスタムルーティン「${name}」を作成しました！`);
});

function populate1RMExerciseSelect() {
  if (!el.selectChartExercise) return;
  
  const currentVal = el.selectChartExercise.value || state.selectedChartExerciseId;
  el.selectChartExercise.innerHTML = '';

  state.exercises.forEach(ex => {
    const opt = document.createElement('option');
    opt.value = ex.id;
    opt.textContent = `${ex.emoji || '💪'} ${ex.name.split(' (')[0]}`;
    if (ex.id === currentVal) {
      opt.selected = true;
    }
    el.selectChartExercise.appendChild(opt);
  });

  if (!el.selectChartExercise.value && state.exercises.length > 0) {
    el.selectChartExercise.value = state.exercises[0].id;
    state.selectedChartExerciseId = state.exercises[0].id;
  }
}

if (el.selectChartExercise) {
  el.selectChartExercise.addEventListener('change', (e) => {
    state.selectedChartExerciseId = e.target.value;
    render1RMChart(state.selectedChartExerciseId);
  });
}

function render1RMChart(exerciseId) {
  if (!el.oneRmChartSvg) return;
  el.oneRmChartSvg.innerHTML = '';

  const selectedEx = state.exercises.find(e => e.id === exerciseId);
  const exerciseName = selectedEx ? selectedEx.name.split(' (')[0] : '種目';

  const historyEntries = [];

  state.workoutHistory.forEach(log => {
    const exEntry = log.exercises.find(e => e.id === exerciseId);
    if (exEntry) {
      let max1RM = 0;
      exEntry.sets.forEach(set => {
        if (set.completed && set.weight > 0 && set.reps > 0) {
          const e1rm = calculateEpley1RM(set.weight, set.reps);
          if (e1rm > max1RM) max1RM = e1rm;
        }
      });

      if (max1RM > 0) {
        historyEntries.push({
          date: new Date(log.date),
          val: max1RM
        });
      }
    }
  });

  historyEntries.sort((a, b) => a.date - b.date);
  const chartData = historyEntries.slice(-7);

  if (chartData.length < 2) {
    el.oneRmChartSvg.innerHTML = `
      <text x="175" y="100" fill="var(--text-muted)" text-anchor="middle" font-size="11">
        「${escapeHTML(exerciseName)}」の記録が2回以上必要です。
      </text>
    `;
    return;
  }

  const values = chartData.map(d => d.val);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const valSpan = maxVal - minVal;
  const valPad = valSpan > 0 ? valSpan * 0.15 : 10;
  const yMax = maxVal + valPad;
  const yMin = Math.max(0, minVal - valPad);

  const w = 350;
  const h = 200;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = w - 2 * paddingX;
  const graphHeight = h - 2 * paddingY;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index * (graphWidth / (chartData.length - 1)));
    const y = h - paddingY - ((d.val - yMin) / (yMax - yMin)) * graphHeight;
    return { x, y, val: d.val, date: d.date };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  let gridLines = '';
  const gridCount = 3;
  for (let i = 0; i <= gridCount; i++) {
    const val = yMin + (i * (yMax - yMin) / gridCount);
    const y = h - paddingY - (i * graphHeight / gridCount);
    
    gridLines += `
      <line x1="${paddingX}" y1="${y}" x2="${w - paddingX}" y2="${y}" class="chart-grid-line" />
      <text x="${paddingX - 8}" y="${y + 3}" fill="var(--text-muted)" font-size="7" text-anchor="end">${Math.round(val)}kg</text>
    `;
  }

  let pointsHTML = '';
  points.forEach((pt, index) => {
    const dateStr = pt.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    pointsHTML += `
      <circle cx="${pt.x}" cy="${pt.y}" r="3.5" class="chart-point" />
      <text x="${pt.x}" y="${pt.y - 8}" class="chart-label" font-size="7" font-weight="bold">${(Math.round(pt.val * 10) / 10).toFixed(1)}</text>
      <text x="${pt.x}" y="${h - paddingY + 12}" fill="var(--text-muted)" font-size="7" text-anchor="middle">${dateStr}</text>
    `;
  });

  el.oneRmChartSvg.innerHTML = `
    ${gridLines}
    <path d="${pathD}" class="chart-line" />
    ${pointsHTML}
  `;
}

if (el.inputMealImage) {
  el.inputMealImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      el.mealImagePreview.style.display = 'none';
      el.imgMealPreview.src = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 120;
        canvas.width = size;
        canvas.height = size;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        el.imgMealPreview.src = compressedBase64;
        el.mealImagePreview.style.display = 'block';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ----------------------------------------------------
// HISTORY-BASED WORKOUTS, ROUTINES & LOG EDITING
// ----------------------------------------------------
function repeatWorkoutFromPastLog(workoutId) {
  const log = state.workoutHistory.find(w => w.id === workoutId);
  if (!log) return;

  if (state.activeWorkout) {
    if (!confirm('現在記録中のワークアウトがあります。破棄してこの内容で新しく開始しますか？')) {
      return;
    }
  }

  const exercisesCopy = log.exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    sets: ex.sets.map(set => ({
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe || '',
      completed: false
    }))
  }));

  state.activeWorkout = {
    name: log.name,
    startTime: Date.now(),
    durationSeconds: 0,
    exercises: exercisesCopy
  };

  DB.saveActiveWorkout();
  navigateTo('logger');
  alert(`「${log.name}」の内容で新しいワークアウトを開始しました！`);
}

function createRoutineFromPastLog(workoutId) {
  const log = state.workoutHistory.find(w => w.id === workoutId);
  if (!log) return;

  // Pre-fill name and render checkboxes with pre-checked exercises
  el.inputRoutineName.value = `ルーティン: ${log.name}`;
  const exerciseIds = log.exercises.map(ex => ex.id);
  renderRoutineExercisesCheckboxes(exerciseIds);

  openModal(el.modalCreateRoutine);
}

function openEditPastWorkoutModal(workoutId) {
  const log = state.workoutHistory.find(w => w.id === workoutId);
  if (!log) return;

  // Deep clone
  state.editingPastWorkout = JSON.parse(JSON.stringify(log));
  state.exerciseSelectContext = 'editPastWorkout';

  // Fill in inputs
  el.inputEditPastId.value = state.editingPastWorkout.id;
  el.inputEditPastName.value = state.editingPastWorkout.name;

  const dateObj = new Date(state.editingPastWorkout.date);
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
  el.inputEditPastDate.value = localDate.toISOString().slice(0, 16);

  // Render list of exercises
  renderEditPastExercises();

  openModal(el.modalEditPastWorkout);
}

function renderEditPastExercises() {
  el.editPastExercisesList.innerHTML = '';

  if (!state.editingPastWorkout || state.editingPastWorkout.exercises.length === 0) {
    el.editPastExercisesList.innerHTML = `
      <div class="no-data" style="border: 1px dashed rgba(255,255,255,0.08); border-radius:16px;">
        種目が登録されていません。「種目を追加」ボタンから筋トレ種目を追加してください。
      </div>
    `;
    return;
  }

  state.editingPastWorkout.exercises.forEach((ex, exIndex) => {
    const card = document.createElement('div');
    card.className = 'logger-exercise-card';
    card.style.marginBottom = '12px';

    const header = document.createElement('div');
    header.className = 'logger-exercise-header';
    header.innerHTML = `
      <div class="logger-exercise-title-wrap">
        <h4>${ex.emoji || '💪'} ${escapeHTML(ex.name)}</h4>
      </div>
      <div class="logger-exercise-actions">
        <button type="button" class="btn-remove-edit-past-exercise" data-idx="${exIndex}" title="種目を削除" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;">
          <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
        </button>
      </div>
    `;

    const table = document.createElement('table');
    table.className = 'logger-sets-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 10%">セット</th>
        <th style="width: 30%">重量 (kg)</th>
        <th style="width: 30%">レップ数</th>
        <th style="width: 20%">RPE</th>
        <th style="width: 10%">削除</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    ex.sets.forEach((set, setIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'set-row';

      const rpeVal = set.rpe || '';

      tr.innerHTML = `
        <td><span class="set-row-num">${setIndex + 1}</span></td>
        <td>
          <div class="set-input-wrap">
            <input type="number" class="set-input edit-past-weight-input" data-ex-idx="${exIndex}" data-set-idx="${setIndex}" value="${set.weight !== undefined ? set.weight : ''}" placeholder="--" step="0.5" inputmode="decimal" required>
            <span class="set-row-unit">kg</span>
          </div>
        </td>
        <td>
          <div class="set-input-wrap">
            <input type="number" class="set-input edit-past-reps-input" data-ex-idx="${exIndex}" data-set-idx="${setIndex}" value="${set.reps !== undefined ? set.reps : ''}" placeholder="--" inputmode="numeric" required>
            <span class="set-row-unit">回</span>
          </div>
        </td>
        <td>
          <div class="set-input-wrap">
            <select class="set-input rpe-select edit-past-rpe-select" data-ex-idx="${exIndex}" data-set-idx="${setIndex}">
              <option value="" ${rpeVal === '' ? 'selected' : ''}>--</option>
              ${[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4, 3, 2, 1].map(v => 
                `<option value="${v}" ${rpeVal == v ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
        </td>
        <td>
          <button type="button" class="btn-delete-edit-past-set" data-ex-idx="${exIndex}" data-set-idx="${setIndex}" style="background:transparent; border:none; color:var(--danger); cursor:pointer; display:flex; justify-content:center; align-items:center; width:100%; height:28px;">
            <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const btnAddSet = document.createElement('button');
    btnAddSet.type = 'button';
    btnAddSet.className = 'btn-add-set-row';
    btnAddSet.textContent = '+ セットを追加';
    btnAddSet.addEventListener('click', () => {
      let lastWeight = '';
      let lastReps = '';
      let lastRpe = '';
      if (ex.sets.length > 0) {
        const last = ex.sets[ex.sets.length - 1];
        lastWeight = last.weight;
        lastReps = last.reps;
        lastRpe = last.rpe || '';
      }
      ex.sets.push({ weight: lastWeight, reps: lastReps, rpe: lastRpe, completed: true });
      renderEditPastExercises();
    });

    card.appendChild(header);
    card.appendChild(table);
    card.appendChild(btnAddSet);

    el.editPastExercisesList.appendChild(card);
  });

  // Attach event listeners for inputs
  document.querySelectorAll('.edit-past-weight-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIdx = parseInt(e.target.dataset.exIdx, 10);
      const setIdx = parseInt(e.target.dataset.setIdx, 10);
      state.editingPastWorkout.exercises[exIdx].sets[setIdx].weight = parseFloat(e.target.value) || 0;
    });
  });

  document.querySelectorAll('.edit-past-reps-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIdx = parseInt(e.target.dataset.exIdx, 10);
      const setIdx = parseInt(e.target.dataset.setIdx, 10);
      state.editingPastWorkout.exercises[exIdx].sets[setIdx].reps = parseInt(e.target.value, 10) || 0;
    });
  });

  document.querySelectorAll('.edit-past-rpe-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const exIdx = parseInt(e.target.dataset.exIdx, 10);
      const setIdx = parseInt(e.target.dataset.setIdx, 10);
      state.editingPastWorkout.exercises[exIdx].sets[setIdx].rpe = e.target.value ? parseFloat(e.target.value) : '';
    });
  });

  // Exercise deletion
  document.querySelectorAll('.btn-remove-edit-past-exercise').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      if (confirm(`「${state.editingPastWorkout.exercises[idx].name}」を削除しますか？`)) {
        state.editingPastWorkout.exercises.splice(idx, 1);
        renderEditPastExercises();
      }
    });
  });

  // Set deletion
  document.querySelectorAll('.btn-delete-edit-past-set').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget;
      const exIdx = parseInt(targetBtn.dataset.exIdx, 10);
      const setIdx = parseInt(targetBtn.dataset.setIdx, 10);
      state.editingPastWorkout.exercises[exIdx].sets.splice(setIdx, 1);
      renderEditPastExercises();
    });
  });
}

if (el.btnEditPastAddExercise) {
  el.btnEditPastAddExercise.addEventListener('click', () => {
    state.exerciseSelectContext = 'editPastWorkout';
    renderSelectableExercisesList();
    openModal(el.modalSelectExercise);
  });
}

if (el.formEditPastWorkout) {
  el.formEditPastWorkout.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!state.editingPastWorkout) return;

    // Filter out any empty sets or empty exercises to save space and clean logs
    const cleanExercises = state.editingPastWorkout.exercises
      .map(ex => {
        const cleanSets = ex.sets.filter(s => s.weight !== undefined && s.reps !== undefined && s.weight !== '' && s.reps !== '');
        return { ...ex, sets: cleanSets };
      })
      .filter(ex => ex.sets.length > 0);

    if (cleanExercises.length === 0) {
      alert('少なくとも1つ以上の種目とセット（重量・回数が入力されているもの）が必要です。');
      return;
    }

    const idx = state.workoutHistory.findIndex(w => w.id === state.editingPastWorkout.id);
    if (idx !== -1) {
      state.editingPastWorkout.exercises = cleanExercises;
      state.editingPastWorkout.date = new Date(el.inputEditPastDate.value).toISOString();
      state.editingPastWorkout.name = el.inputEditPastName.value.trim() || 'ワークアウト';
      
      state.workoutHistory[idx] = state.editingPastWorkout;
      DB.saveHistory();
      closeModal(el.modalEditPastWorkout);
      
      // Refresh views
      renderHistory();
      renderDashboard();
      if (state.selectedHistoryTab === 'stats') {
        populate1RMExerciseSelect();
        renderStatsChart();
        render1RMChart(state.selectedChartExerciseId);
      }
      
      alert('トレーニング記録を変更しました！');
    }
  });
}

// ----------------------------------------------------
// APP INITIALIZATION
// ----------------------------------------------------
function init() {
  DB.load();
  
  // Set initial screen
  navigateTo('dashboard');
  
  console.log('App Initialized successfully!');
}

init();
