import i18n from 'i18next';
import HttpApi from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';


i18n
    .use(HttpApi)
    .use(initReactI18next)
    .init({
        supportedLngs: ['pt', 'en'],
        fallbackLng: 'pt',
        lng: 'pt',
        debug: process.env.NODE_ENV === 'development',

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        interpolation: {
            escapeValue: false,
        },

        react: {
            useSuspense: true,
        }
    });

    export default i18n;