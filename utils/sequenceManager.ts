import type { SequenceModuleKey, SequenceConfig, NumberingSequenceSettings } from '../types.ts';

export const DEFAULT_SEQUENCE_SETTINGS: NumberingSequenceSettings = {
    customerPayments: {
        prefix: 'CP',
        includeYear: false,
        padding: 3,
        startNumber: 1,
        delimiter: '',
    },
    supplierPayments: {
        prefix: 'SP',
        includeYear: false,
        padding: 3,
        startNumber: 1,
        delimiter: '',
    },
    treasuryTransfers: {
        prefix: 'TR',
        includeYear: false,
        padding: 3,
        startNumber: 1,
        delimiter: '',
    },
    expenses: {
        prefix: 'EXP',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    salesInvoices: {
        prefix: 'INV',
        includeYear: false,
        padding: 5,
        startNumber: 1,
        delimiter: '-',
    },
    purchaseInvoices: {
        prefix: 'PUR',
        includeYear: false,
        padding: 5,
        startNumber: 1,
        delimiter: '-',
    },
    quotations: {
        prefix: 'QT',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    purchaseRequests: {
        prefix: 'PR',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    purchaseOrders: {
        prefix: 'PO',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    printingJobOrders: {
        prefix: 'JOB',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    productionOrders: {
        prefix: 'MO',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    customers: {
        prefix: 'C',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    suppliers: {
        prefix: 'S',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    products: {
        prefix: 'PRD',
        includeYear: false,
        padding: 4,
        startNumber: 1,
        delimiter: '-',
    },
    journalEntries: {
        prefix: 'JE',
        includeYear: false,
        padding: 5,
        startNumber: 1,
        delimiter: '-',
    },
};

const STORAGE_KEY = 'mediahive_sequence_settings';

/**
 * Loads current sequence settings from localStorage merged with defaults
 */
export const getSequenceSettings = (): NumberingSequenceSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SEQUENCE_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error('Error loading sequence settings:', e);
    }
    return DEFAULT_SEQUENCE_SETTINGS;
};

/**
 * Saves updated sequence settings to localStorage
 */
export const saveSequenceSettings = (settings: NumberingSequenceSettings): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('sequence-settings-changed', { detail: settings }));
    } catch (e) {
        console.error('Error saving sequence settings:', e);
    }
};

/**
 * Formats a sequence string given a configuration and number
 */
export const formatSequence = (config: SequenceConfig, num: number): string => {
    const year = new Date().getFullYear().toString();
    const paddedNum = num.toString().padStart(config.padding, '0');
    const d = config.delimiter ?? '';

    if (config.includeYear) {
        return `${config.prefix}${d}${year}${d}${paddedNum}`;
    }
    return `${config.prefix}${d}${paddedNum}`;
};

/**
 * Returns a live preview string for a configuration
 */
export const previewSequence = (config: SequenceConfig): string => {
    return formatSequence(config, config.startNumber || 1);
};

/**
 * Generates the next sequential ID/code based on user configuration and existing list
 */
export const generateNextSequence = (
    moduleKey: SequenceModuleKey,
    existingItems: Array<any> = []
): string => {
    const settings = getSequenceSettings();
    const config = settings[moduleKey] || DEFAULT_SEQUENCE_SETTINGS[moduleKey];

    // Find highest existing numeric sequence matching this config
    const prefix = config.prefix;
    const delimiter = config.delimiter ?? '';
    const currentYear = new Date().getFullYear().toString();

    let maxNum = 0;

    (existingItems || []).forEach(item => {
        if (!item) return;
        // Check potential ID/Code fields
        const candidate = item.id || item.code || item.invoiceNumber || item.voucherNumber || item.orderNumber || '';
        if (typeof candidate !== 'string') return;

        // Skip intercompany mirrored items (e.g. CP-IC-..., SP-IC-..., TR-IC-...)
        if (candidate.includes('-IC-')) return;

        // Pattern matching:
        // Case 1: with year (e.g. INV-2026-0001 or CP2026001)
        if (config.includeYear) {
            const yearPattern = `${prefix}${delimiter}${currentYear}${delimiter}`;
            if (candidate.startsWith(yearPattern)) {
                const numPart = candidate.substring(yearPattern.length);
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
            }
        } else {
            // Case 2: standard prefix (e.g. CP001 or INV-00001)
            const standardPattern = `${prefix}${delimiter}`;
            if (candidate.startsWith(standardPattern)) {
                const numPart = candidate.substring(standardPattern.length);
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
            } else if (candidate.startsWith(prefix)) {
                // In case delimiter is empty or differs slightly
                const numPart = candidate.substring(prefix.length).replace(/^[-_/]/, '');
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
            }
        }
    });

    const nextNum = Math.max(maxNum + 1, config.startNumber || 1);
    return formatSequence(config, nextNum);
};
