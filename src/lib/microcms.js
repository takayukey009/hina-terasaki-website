import { createClient } from 'microcms-js-sdk';

export const client = createClient({
    serviceDomain: 'hina-terasaki-blog',
    apiKey: 'R3jtpKejXVlfIbaF3UKCa8a6z4Z5D6eiiCFy',
});

// ニュースを取得
export const getNews = async () => {
    const data = await client.get({ endpoint: 'news', queries: { limit: 10 } });
    return data.contents;
};

// スケジュールを取得
export const getSchedule = async () => {
    const data = await client.get({ endpoint: 'schedule', queries: { limit: 10, orders: 'date' } });
    return data.contents;
};
