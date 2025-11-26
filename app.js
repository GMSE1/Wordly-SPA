/**
 * =====================================================
 * WORDLY - Interactive Language Learning Dictionary
 * =====================================================
 * Author: Gregory Marshall, Jr.
 * Description: Modern dictionary application for language learners
 * Version: 2.0.0
 */

// ===== CONFIGURATION =====

/**
 * API Configuration
 */
const API_CONFIG = {
    BASE_URL: 'https://api.dictionaryapi.dev/api/v2/entries/en',
    TIMEOUT: 10000, // 10 seconds
};

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
    SEARCH_HISTORY: 'wordly_search_history',
    FAVORITES: 'wordly_favorites',
    THEME: 'wordly_theme',
};

/**
 * Application constants
 */
const APP_CONSTANTS = {
    MAX_HISTORY_ITEMS: 50,
    MAX_FAVORITES_ITEMS: 100,
    DEFAULT_WORD: 'language',
};

// ===== UTILITY FUNCTIONS =====

/**
 * Utility class for common operations
 */
class Utils {
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Capitalize first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

/**
 * LocalStorage manager with error handling
 */
class StorageManager {
    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    static save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Stored value or default
     */
    static load(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Remove data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} Availability status
     */
    static isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ===== DOM MANAGER =====

/**
 * DOM element manager - centralized element references
 */
class DOMManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    /**
     * Initialize all DOM element references
     * @returns {Object} Object containing all DOM elements
     */
    initializeElements() {
        return {
            // Form elements
            searchForm: document.getElementById('searchForm'),
            wordInput: document.getElementById('wordInput'),

            // Display states
            loadingState: document.getElementById('loadingState'),
            errorContainer: document.getElementById('errorContainer'),
            errorTitle: document.getElementById('errorTitle'),
            errorMessage: document.getElementById('errorMessage'),
            wordDisplay: document.getElementById('wordDisplay'),

            // Word header
            wordTitle: document.getElementById('wordTitle'),
            favoriteBtn: document.getElementById('favoriteBtn'),
            phoneticText: document.getElementById('phoneticText'),
            audioBtn: document.getElementById('audioBtn'),
            wordAudio: document.getElementById('wordAudio'),

            // Content sections
            meaningsContainer: document.getElementById('meaningsContainer'),
            synonymsContainer: document.getElementById('synonymsContainer'),
            synonymsList: document.getElementById('synonymsList'),
            antonymsContainer: document.getElementById('antonymsContainer'),
            antonymsList: document.getElementById('antonymsList'),
            sourceLink: document.getElementById('sourceLink'),

            // Quick actions
            randomWordBtn: document.getElementById('randomWordBtn'),
            historyBtn: document.getElementById('historyBtn'),
            favoritesBtn: document.getElementById('favoritesBtn'),

            // Sidebars
            historySidebar: document.getElementById('historySidebar'),
            favoritesSidebar: document.getElementById('favoritesSidebar'),
            historyList: document.getElementById('historyList'),
            favoritesList: document.getElementById('favoritesList'),
            closeHistoryBtn: document.getElementById('closeHistoryBtn'),
            closeFavoritesBtn: document.getElementById('closeFavoritesBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            clearFavoritesBtn: document.getElementById('clearFavoritesBtn'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),

            // Theme toggle
            themeToggle: document.getElementById('themeToggle'),
        };
    }

    /**
     * Get a DOM element by ID
     * @param {string} key - Element key
     * @returns {HTMLElement|null} DOM element
     */
    get(key) {
        return this.elements[key] || null;
    }
}

// ===== API SERVICE =====

/**
 * API service for fetching word data
 */
class DictionaryAPI {
    /**
     * Fetch word data from the API
     * @param {string} word - Word to look up
     * @returns {Promise<Object>} Word data
     * @throws {Error} API errors
     */
    static async fetchWord(word) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/${encodeURIComponent(word)}`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('WORD_NOT_FOUND');
                }
                throw new Error('API_ERROR');
            }

            const data = await response.json();
            return data[0]; // Return first result

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('TIMEOUT');
            }

            if (error.message === 'WORD_NOT_FOUND') {
                throw error;
            }

            throw new Error('NETWORK_ERROR');
        }
    }

    /**
     * Extract audio URL from phonetics
     * @param {Array} phonetics - Phonetics array
     * @returns {string|null} Audio URL or null
     */
    static extractAudioUrl(phonetics) {
        if (!phonetics || !Array.isArray(phonetics)) {
            return null;
        }

        const phoneticWithAudio = phonetics.find(
            p => p.audio && p.audio.trim().length > 0
        );

        return phoneticWithAudio ? phoneticWithAudio.audio : null;
    }

    /**
     * Collect all unique synonyms from meanings
     * @param {Array} meanings - Meanings array
     * @returns {Array<string>} Unique synonyms
     */
    static collectSynonyms(meanings) {
        const synonymsSet = new Set();

        meanings.forEach(meaning => {
            // Meaning-level synonyms
            if (meaning.synonyms?.length) {
                meaning.synonyms.forEach(syn => synonymsSet.add(syn));
            }

            // Definition-level synonyms
            meaning.definitions.forEach(def => {
                if (def.synonyms?.length) {
                    def.synonyms.forEach(syn => synonymsSet.add(syn));
                }
            });
        });

        return Array.from(synonymsSet);
    }

    /**
     * Collect all unique antonyms from meanings
     * @param {Array} meanings - Meanings array
     * @returns {Array<string>} Unique antonyms
     */
    static collectAntonyms(meanings) {
        const antonymsSet = new Set();

        meanings.forEach(meaning => {
            // Meaning-level antonyms
            if (meaning.antonyms?.length) {
                meaning.antonyms.forEach(ant => antonymsSet.add(ant));
            }

            // Definition-level antonyms
            meaning.definitions.forEach(def => {
                if (def.antonyms?.length) {
                    def.antonyms.forEach(ant => antonymsSet.add(ant));
                }
            });
        });

        return Array.from(antonymsSet);
    }
}

// ===== UI MANAGER =====

/**
 * UI manager for rendering and updating the interface
 */
class UIManager {
    constructor(domManager) {
        this.dom = domManager;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.dom.get('loadingState').classList.remove('hidden');
        this.dom.get('errorContainer').classList.add('hidden');
        this.dom.get('wordDisplay').classList.add('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.dom.get('loadingState').classList.add('hidden');
    }

    /**
     * Show error message
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    showError(title, message) {
        this.dom.get('errorTitle').textContent = title;
        this.dom.get('errorMessage').textContent = message;
        this.dom.get('errorContainer').classList.remove('hidden');
        this.dom.get('wordDisplay').classList.add('hidden');
        this.hideLoading();
    }

    /**
     * Hide error message
     */
    hideError() {
        this.dom.get('errorContainer').classList.add('hidden');
    }

    /**
     * Render word data to the UI
     * @param {Object} wordData - Word data from API
     * @param {boolean} isFavorite - Whether word is favorited
     */
    renderWord(wordData, isFavorite) {
        // Update word title
        this.dom.get('wordTitle').textContent = Utils.capitalize(wordData.word);

        // Update favorite button
        this.updateFavoriteButton(isFavorite);

        // Update phonetic information
        this.renderPhonetics(wordData);

        // Setup audio
        this.setupAudio(wordData.phonetics || []);

        // Render meanings
        this.renderMeanings(wordData.meanings);

        // Render related words
        const synonyms = DictionaryAPI.collectSynonyms(wordData.meanings);
        const antonyms = DictionaryAPI.collectAntonyms(wordData.meanings);
        this.renderRelatedWords(synonyms, antonyms);

        // Update source link
        if (wordData.sourceUrls?.length) {
            this.dom.get('sourceLink').href = wordData.sourceUrls[0];
        }

        // Show word display
        this.dom.get('wordDisplay').classList.remove('hidden');
        this.hideLoading();
        this.hideError();

        // Scroll to word display on mobile
        if (window.innerWidth < 768) {
            this.dom.get('wordDisplay').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    /**
     * Render phonetic information
     * @param {Object} wordData - Word data
     */
    renderPhonetics(wordData) {
        const phoneticEl = this.dom.get('phoneticText');
        
        if (wordData.phonetic) {
            phoneticEl.textContent = wordData.phonetic;
        } else if (wordData.phonetics?.length && wordData.phonetics[0].text) {
            phoneticEl.textContent = wordData.phonetics[0].text;
        } else {
            phoneticEl.textContent = '';
        }
    }

    /**
     * Setup audio pronunciation
     * @param {Array} phonetics - Phonetics array
     */
    setupAudio(phonetics) {
        const audioUrl = DictionaryAPI.extractAudioUrl(phonetics);
        const audioBtn = this.dom.get('audioBtn');
        const audioElement = this.dom.get('wordAudio');

        if (audioUrl) {
            audioElement.src = audioUrl;
            audioBtn.classList.remove('hidden');
        } else {
            audioBtn.classList.add('hidden');
        }
    }

    /**
     * Render word meanings (parts of speech and definitions)
     * @param {Array} meanings - Meanings array
     */
    renderMeanings(meanings) {
        const container = this.dom.get('meaningsContainer');
        container.innerHTML = '';

        meanings.forEach(meaning => {
            const meaningSection = this.createMeaningSection(meaning);
            container.appendChild(meaningSection);
        });
    }

    /**
     * Create a meaning section element
     * @param {Object} meaning - Meaning object
     * @returns {HTMLElement} Meaning section element
     */
    createMeaningSection(meaning) {
        const section = document.createElement('div');
        section.className = 'meaning-section';

        // Part of speech badge
        const badge = document.createElement('span');
        badge.className = 'part-of-speech';
        badge.textContent = meaning.partOfSpeech;
        section.appendChild(badge);

        // Definitions list
        const list = document.createElement('ol');
        list.className = 'definitions-list';

        meaning.definitions.forEach(def => {
            const item = this.createDefinitionItem(def);
            list.appendChild(item);
        });

        section.appendChild(list);
        return section;
    }

    /**
     * Create a definition item element
     * @param {Object} definition - Definition object
     * @returns {HTMLElement} Definition item element
     */
    createDefinitionItem(definition) {
        const item = document.createElement('li');
        item.className = 'definition-item';

        // Definition text
        const defText = document.createElement('div');
        defText.className = 'definition-text';
        defText.textContent = definition.definition;
        item.appendChild(defText);

        // Example (if available)
        if (definition.example) {
            const example = document.createElement('div');
            example.className = 'example-text';
            example.textContent = definition.example;
            item.appendChild(example);
        }

        return item;
    }

    /**
     * Render related words (synonyms and antonyms)
     * @param {Array<string>} synonyms - Synonyms array
     * @param {Array<string>} antonyms - Antonyms array
     */
    renderRelatedWords(synonyms, antonyms) {
        const synonymsContainer = this.dom.get('synonymsContainer');
        const antonymsContainer = this.dom.get('antonymsContainer');

        // Render synonyms
        if (synonyms.length > 0) {
            this.renderWordTags(this.dom.get('synonymsList'), synonyms);
            synonymsContainer.classList.remove('hidden');
        } else {
            synonymsContainer.classList.add('hidden');
        }

        // Render antonyms
        if (antonyms.length > 0) {
            this.renderWordTags(this.dom.get('antonymsList'), antonyms);
            antonymsContainer.classList.remove('hidden');
        } else {
            antonymsContainer.classList.add('hidden');
        }
    }

    /**
     * Render word tags (clickable related words)
     * @param {HTMLElement} container - Container element
     * @param {Array<string>} words - Words array
     */
    renderWordTags(container, words) {
        container.innerHTML = '';

        words.forEach(word => {
            const tag = document.createElement('span');
            tag.className = 'word-tag';
            tag.textContent = word;
            tag.setAttribute('role', 'button');
            tag.setAttribute('tabindex', '0');
            tag.addEventListener('click', () => this.onWordTagClick(word));
            tag.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.onWordTagClick(word);
                }
            });
            container.appendChild(tag);
        });
    }

    /**
     * Handle word tag click - to be overridden by app
     * @param {string} word - Word that was clicked
     */
    onWordTagClick(word) {
        // This will be overridden by the WordlyApp
        console.log('Word tag clicked:', word);
    }

    /**
     * Update favorite button state
     * @param {boolean} isFavorite - Whether word is favorited
     */
    updateFavoriteButton(isFavorite) {
        const btn = this.dom.get('favoriteBtn');
        const icon = btn.querySelector('.star-icon');

        if (isFavorite) {
            btn.classList.add('active');
            icon.textContent = '★';
            btn.setAttribute('aria-label', 'Remove from favorites');
        } else {
            btn.classList.remove('active');
            icon.textContent = '☆';
            btn.setAttribute('aria-label', 'Add to favorites');
        }
    }

    /**
     * Render sidebar list
     * @param {HTMLElement} listElement - List element
     * @param {Array<string>} items - Items to render
     * @param {string} emptyMessage - Message when list is empty
     */
    renderSidebarList(listElement, items, emptyMessage) {
        listElement.innerHTML = '';

        if (items.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'sidebar-list-empty';
            emptyItem.textContent = emptyMessage;
            listElement.appendChild(emptyItem);
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'sidebar-list-item';
            li.textContent = Utils.capitalize(item);
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');
            listElement.appendChild(li);
        });
    }
}

// ===== THEME MANAGER =====

/**
 * Theme manager for dark/light mode
 */
class ThemeManager {
    constructor(domManager) {
        this.dom = domManager;
        this.isDark = false;
    }

    /**
     * Initialize theme from storage
     */
    initialize() {
        this.isDark = StorageManager.load(STORAGE_KEYS.THEME, false);
        this.apply();
    }

    /**
     * Toggle theme
     */
    toggle() {
        this.isDark = !this.isDark;
        this.apply();
        StorageManager.save(STORAGE_KEYS.THEME, this.isDark);
    }

    /**
     * Apply current theme
     */
    apply() {
        const icon = this.dom.get('themeToggle').querySelector('.theme-icon');

        if (this.isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            icon.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            icon.textContent = '🌙';
        }
    }
}

// ===== SIDEBAR MANAGER =====

/**
 * Sidebar manager for history and favorites
 */
class SidebarManager {
    constructor(domManager) {
        this.dom = domManager;
        this.activeSidebar = null;
    }

    /**
     * Show history sidebar
     */
    showHistory() {
        this.show(this.dom.get('historySidebar'));
    }

    /**
     * Show favorites sidebar
     */
    showFavorites() {
        this.show(this.dom.get('favoritesSidebar'));
    }

    /**
     * Show a specific sidebar
     * @param {HTMLElement} sidebar - Sidebar element
     */
    show(sidebar) {
        this.closeAll();
        this.activeSidebar = sidebar;
        sidebar.classList.remove('hidden');
        sidebar.classList.add('active');
        this.dom.get('sidebarOverlay').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close all sidebars
     */
    closeAll() {
        const sidebars = [
            this.dom.get('historySidebar'),
            this.dom.get('favoritesSidebar')
        ];

        sidebars.forEach(sidebar => {
            sidebar.classList.remove('active');
        });

        this.dom.get('sidebarOverlay').classList.add('hidden');
        document.body.style.overflow = '';

        // Hide after animation
        setTimeout(() => {
            sidebars.forEach(sidebar => {
                if (!sidebar.classList.contains('active')) {
                    sidebar.classList.add('hidden');
                }
            });
        }, 300);

        this.activeSidebar = null;
    }

    /**
     * Check if any sidebar is open
     * @returns {boolean} True if sidebar is open
     */
    isOpen() {
        return this.activeSidebar !== null;
    }
}

// ===== MAIN APPLICATION =====

/**
 * Main Wordly application class
 */
class WordlyApp {
    constructor() {
        this.dom = new DOMManager();
        this.ui = new UIManager(this.dom);
        this.theme = new ThemeManager(this.dom);
        this.sidebar = new SidebarManager(this.dom);

        // Application state
        this.state = {
            currentWord: null,
            searchHistory: [],
            favorites: [],
        };

        // Random words for the random word feature
        this.randomWords = [
            'eloquent', 'resilient', 'serendipity', 'ephemeral', 'magnificent',
            'luminous', 'harmony', 'tranquil', 'vibrant', 'sublime',
            'cascade', 'pristine', 'euphoria', 'zenith', 'flourish',
            'enigma', 'persevere', 'radiant', 'whimsical', 'benevolent',
            'vocabulary', 'pronunciation', 'grammar', 'fluency', 'articulate'
        ];
    }

    /**
     * Initialize the application
     */
    async initialize() {
        console.log('🚀 Wordly Dictionary App initialized!');

        // Load saved data
        this.loadSavedData();

        // Initialize theme
        this.theme.initialize();

        // Setup event listeners
        this.setupEventListeners();

        // Override UI word tag click handler
        this.ui.onWordTagClick = (word) => this.searchWord(word);

        // Search default word
        await this.searchWord(APP_CONSTANTS.DEFAULT_WORD);

        // Announce keyboard shortcuts
        console.log('⌨️  Keyboard shortcuts:');
        console.log('  • Press "/" to focus search');
        console.log('  • Press "Esc" to close sidebars');
    }

    /**
     * Load saved data from localStorage
     */
    loadSavedData() {
        this.state.searchHistory = StorageManager.load(
            STORAGE_KEYS.SEARCH_HISTORY,
            []
        );

        this.state.favorites = StorageManager.load(
            STORAGE_KEYS.FAVORITES,
            []
        );
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Search form
        this.dom.get('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const word = this.dom.get('wordInput').value.trim();
            if (word) {
                this.searchWord(word);
            }
        });

        // Quick action buttons
        this.dom.get('randomWordBtn').addEventListener('click', () => {
            this.searchRandomWord();
        });

        this.dom.get('historyBtn').addEventListener('click', () => {
            this.showHistory();
        });

        this.dom.get('favoritesBtn').addEventListener('click', () => {
            this.showFavorites();
        });

        // Favorite button
        this.dom.get('favoriteBtn').addEventListener('click', () => {
            this.toggleFavorite();
        });

        // Audio button
        this.dom.get('audioBtn').addEventListener('click', () => {
            this.dom.get('wordAudio').play();
        });

        // Sidebar close buttons
        this.dom.get('closeHistoryBtn').addEventListener('click', () => {
            this.sidebar.closeAll();
        });

        this.dom.get('closeFavoritesBtn').addEventListener('click', () => {
            this.sidebar.closeAll();
        });

        this.dom.get('sidebarOverlay').addEventListener('click', () => {
            this.sidebar.closeAll();
        });

        // Clear buttons
        this.dom.get('clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });

        this.dom.get('clearFavoritesBtn').addEventListener('click', () => {
            this.clearFavorites();
        });

        // Theme toggle
        this.dom.get('themeToggle').addEventListener('click', () => {
            this.theme.toggle();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // History list clicks
        this.dom.get('historyList').addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-list-item')) {
                const word = e.target.textContent.toLowerCase();
                this.searchWord(word);
                this.sidebar.closeAll();
            }
        });

        // Favorites list clicks
        this.dom.get('favoritesList').addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-list-item')) {
                const word = e.target.textContent.toLowerCase();
                this.searchWord(word);
                this.sidebar.closeAll();
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboard(event) {
        // Focus search with "/"
        if (event.key === '/' && 
            document.activeElement !== this.dom.get('wordInput')) {
            event.preventDefault();
            this.dom.get('wordInput').focus();
        }

        // Close sidebars with Escape
        if (event.key === 'Escape') {
            this.sidebar.closeAll();
        }
    }

    /**
     * Search for a word
     * @param {string} word - Word to search
     */
    async searchWord(word) {
        if (!word || word.trim() === '') {
            this.ui.showError(
                'Invalid Input',
                'Please enter a word to look up.'
            );
            return;
        }

        const cleanWord = word.trim().toLowerCase();

        // Update input field
        this.dom.get('wordInput').value = cleanWord;

        // Show loading
        this.ui.showLoading();

        try {
            // Fetch word data
            const wordData = await DictionaryAPI.fetchWord(cleanWord);

            // Update state
            this.state.currentWord = wordData;

            // Add to history
            this.addToHistory(wordData.word);

            // Render word
            const isFavorite = this.state.favorites.includes(wordData.word);
            this.ui.renderWord(wordData, isFavorite);

        } catch (error) {
            console.error('Error searching word:', error);
            this.handleSearchError(error, cleanWord);
        }
    }

    /**
     * Handle search errors
     * @param {Error} error - Error object
     * @param {string} word - Word that was searched
     */
    handleSearchError(error, word) {
        switch (error.message) {
            case 'WORD_NOT_FOUND':
                this.ui.showError(
                    'Word Not Found',
                    `Sorry, we couldn't find "${word}" in our dictionary. Please check your spelling and try again.`
                );
                break;

            case 'TIMEOUT':
                this.ui.showError(
                    'Request Timeout',
                    'The request took too long. Please check your internet connection and try again.'
                );
                break;

            case 'NETWORK_ERROR':
                this.ui.showError(
                    'Network Error',
                    'Unable to connect to the dictionary service. Please check your internet connection and try again.'
                );
                break;

            default:
                this.ui.showError(
                    'Unexpected Error',
                    'An unexpected error occurred. Please try again later.'
                );
        }
    }

    /**
     * Search for a random word
     */
    searchRandomWord() {
        const randomIndex = Math.floor(Math.random() * this.randomWords.length);
        const word = this.randomWords[randomIndex];
        this.searchWord(word);
    }

    /**
     * Add word to search history
     * @param {string} word - Word to add
     */
    addToHistory(word) {
        // Remove if already exists
        this.state.searchHistory = this.state.searchHistory.filter(
            w => w !== word
        );

        // Add to beginning
        this.state.searchHistory.unshift(word);

        // Limit size
        if (this.state.searchHistory.length > APP_CONSTANTS.MAX_HISTORY_ITEMS) {
            this.state.searchHistory = this.state.searchHistory.slice(
                0,
                APP_CONSTANTS.MAX_HISTORY_ITEMS
            );
        }

        // Save to storage
        StorageManager.save(STORAGE_KEYS.SEARCH_HISTORY, this.state.searchHistory);
    }

    /**
     * Show history sidebar
     */
    showHistory() {
        this.ui.renderSidebarList(
            this.dom.get('historyList'),
            this.state.searchHistory,
            'No search history yet. Start exploring words!'
        );
        this.sidebar.showHistory();
    }

    /**
     * Clear search history
     */
    clearHistory() {
        if (confirm('Are you sure you want to clear your search history?')) {
            this.state.searchHistory = [];
            StorageManager.save(STORAGE_KEYS.SEARCH_HISTORY, []);
            this.showHistory();
        }
    }

    /**
     * Toggle favorite status of current word
     */
    toggleFavorite() {
        if (!this.state.currentWord) return;

        const word = this.state.currentWord.word;
        const index = this.state.favorites.indexOf(word);

        if (index > -1) {
            // Remove from favorites
            this.state.favorites.splice(index, 1);
        } else {
            // Add to favorites
            if (this.state.favorites.length >= APP_CONSTANTS.MAX_FAVORITES_ITEMS) {
                alert(`You can only save up to ${APP_CONSTANTS.MAX_FAVORITES_ITEMS} favorites.`);
                return;
            }
            this.state.favorites.push(word);
        }

        // Save to storage
        StorageManager.save(STORAGE_KEYS.FAVORITES, this.state.favorites);

        // Update UI
        const isFavorite = this.state.favorites.includes(word);
        this.ui.updateFavoriteButton(isFavorite);

        // Update favorites list if open
        if (this.sidebar.activeSidebar === this.dom.get('favoritesSidebar')) {
            this.showFavorites();
        }
    }

    /**
     * Show favorites sidebar
     */
    showFavorites() {
        this.ui.renderSidebarList(
            this.dom.get('favoritesList'),
            this.state.favorites,
            'No favorite words yet. Click the star to save words!'
        );
        this.sidebar.showFavorites();
    }

    /**
     * Clear all favorites
     */
    clearFavorites() {
        if (confirm('Are you sure you want to clear all your favorite words?')) {
            this.state.favorites = [];
            StorageManager.save(STORAGE_KEYS.FAVORITES, []);
            this.showFavorites();
            
            // Update favorite button if current word was favorited
            if (this.state.currentWord) {
                this.ui.updateFavoriteButton(false);
            }
        }
    }
}

// ===== APPLICATION INITIALIZATION =====

/**
 * Initialize the application when DOM is ready
 */
function initializeApp() {
    try {
        // Check localStorage availability
        if (!StorageManager.isAvailable()) {
            console.warn('⚠️  localStorage is not available. Some features may not work properly.');
        }

        // Create and initialize app
        const app = new WordlyApp();
        app.initialize();

        // Make app globally available for debugging
        if (typeof window !== 'undefined') {
            window.WordlyApp = app;
        }

    } catch (error) {
        console.error('❌ Failed to initialize Wordly app:', error);
        alert('Failed to initialize the application. Please refresh the page.');
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
