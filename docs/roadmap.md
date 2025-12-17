# Known Bugs and Roadmap

## Known Bugs / Limitations

* If no OpenAQ monitoring station is found near the input coordinates, air quality data will be missing.
* Some OpenAQ stations do not provide PM2.5/PM10 consistently.
* Weather data depends on OpenWeather availability and API limits.

## Roadmap

* Add better pollutant interpretation (threshold-based or AQI conversion).
* Add user authentication and per-user favorites.
* Add caching for API calls to reduce repeated external requests.
* Add tests for API routes and UI interactions.
