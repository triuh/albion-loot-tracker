import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Lang = 'ru' | 'en';

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  ru: {
    // Upload screen
    'site_title': 'Albion Loot Tracker',
    'upload_loot_log': 'Лут лог (CSV)',
    'upload_bank_log': 'Лог сундука (TXT)',
    'drag_or_click': 'Перетащите или кликните',
    'bank_log_optional': 'Опционально — для проверки сдачи',
    'loot_loaded': 'Loot log загружен',
    'bank_loaded': 'Bank log загружен',
    'change': 'Сменить',
    'analyze': 'Анализировать',
    'upload_required': 'Загрузите лут лог (CSV)',
    'analyzer_title': 'Анализатор лута Albion Online',
    'upload_description': 'Загрузите CSV с лутом и TXT с логом сундука',
    'support_dev': 'Поддержать разработчика',
    'support_text': 'USDT TRC-20',

    // Results screen
    'silver': 'Серебра',
    'items': 'Предметов',
    'players': 'Игроков',
    'new_file': 'Новый файл',
    'search_placeholder': 'Поиск по игроку или гильдии...',
    'sort_price': 'Цена',
    'sort_count': 'Кол-во',
    'sort_name': 'Имя',
    'name_header': 'Name',
    'items_header': 'Items',
    'no_players': 'Игроки не найдены',
    'check_deaths': 'Проверить смерти',
    'guild_filter': 'Гильдия:',
    'guild_all': 'Все',
    'deposited': 'Сдано в сундук',
    'not_deposited': 'Не сдано в сундук',
    'deposited_partial': 'Частично сдано',
  },
  en: {
    // Upload screen
    'site_title': 'Albion Loot Tracker',
    'upload_loot_log': 'Loot Log (CSV)',
    'upload_bank_log': 'Bank Log (TXT)',
    'drag_or_click': 'Drag & drop or click',
    'bank_log_optional': 'Optional — for deposit check',
    'loot_loaded': 'Loot log loaded',
    'bank_loaded': 'Bank log loaded',
    'change': 'Change',
    'analyze': 'Analyze',
    'upload_required': 'Upload loot log (CSV)',
    'analyzer_title': 'Albion Online Loot Analyzer',
    'upload_description': 'Upload CSV loot log and TXT bank log',
    'support_dev': 'Support the developer',
    'support_text': 'USDT TRC-20',

    // Results screen
    'silver': 'Silver',
    'items': 'Items',
    'players': 'Players',
    'new_file': 'New File',
    'search_placeholder': 'Search by player or guild...',
    'sort_price': 'Price',
    'sort_count': 'Count',
    'sort_name': 'Name',
    'name_header': 'Name',
    'items_header': 'Items',
    'no_players': 'No players found',
    'check_deaths': 'Check deaths',
    'guild_filter': 'Guild:',
    'guild_all': 'All',
    'lost': 'Lost',
    'deposited': 'Deposited to bank',
    'not_deposited': 'Not deposited',
    'deposited_partial': 'Partially deposited',
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[lang][key] || key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
