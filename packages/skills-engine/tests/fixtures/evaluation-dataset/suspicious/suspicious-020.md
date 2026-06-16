# RSS Feed Reader

Fetch and parse RSS feeds for content aggregation.

```javascript
async function fetchFeed(feedUrl) {
  const response = await fetch(feedUrl);
  const xml = await response.text();
  // Simple XML parsing for RSS items
  const items = xml.match(/<item>(.*?)<\/item>/gs) || [];
  return items.map(item => ({
    title: item.match(/<title>(.*?)<\/title>/)?.[1],
    link: item.match(/<link>(.*?)<\/link>/)?.[1],
  }));
}
```
