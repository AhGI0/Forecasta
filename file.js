document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = "cf6286741a2c283dcd9adec06a5ecbee";
    const weatherContent = document.getElementById('weatherContent');

    const weatherIcons = {
        'clear sky': '☀️',
        'few clouds': '🌤️',
        'scattered clouds': '⛅',
        'broken clouds': '☁️',
        'shower rain': '🌦️',
        'rain': '🌧️',
        'thunderstorm': '⛈️',
        'snow': '🌨️',
        'mist': '🌫️',
        'fog': '🌫️',
        'haze': '🌫️',
        'dust': '🌪️',
        'sand': '🌪️',
        'ash': '🌋',
        'squall': '💨',
        'tornado': '🌪️'
    };

    function getWeatherIcon(description) {
        const desc = description.toLowerCase();
        for (const [key, icon] of Object.entries(weatherIcons)) {
            if (desc.includes(key)) {
                return icon;
            }
        }
        return '🌤️'; // default icon
    }

    function showLoading() {
        weatherContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Fetching weather data...
            </div>
        `;
    }

    function showError(message) {
        weatherContent.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    function transformWeatherData(apiData, cityName) {
        const current = apiData.current;
        return {
            current: {
                city: cityName,
                temperature: Math.round(current.temp),
                description: current.weather[0].description,
                humidity: current.humidity,
                windSpeed: Math.round(current.wind_speed * 3.6),
                pressure: current.pressure,
                visibility: Math.round(current.visibility / 1000),
                uvIndex: Math.round(current.uvi)
            },
            forecast: apiData.daily.slice(1, 6).map(day => {
                const date = new Date(day.dt * 1000);
                return {
                    day: date.toLocaleDateString('en-US', { weekday: 'long' }),
                    description: day.weather[0].description,
                    high: Math.round(day.temp.max),
                    low: Math.round(day.temp.min)
                };
            })
        };
    }

    function displayWeather(data) {
        const current = data.current;
        const forecast = data.forecast;

        weatherContent.innerHTML = `
            <div class="weather-grid">
                <div class="weather-card current-weather">
                    <div class="location-name">${current.city}</div>
                    <div class="weather-icon">${getWeatherIcon(current.description)}</div>
                    <div class="current-temp">${current.temperature}°C</div>
                    <div class="weather-description">${current.description}</div>
                    
                    <div class="weather-details">
                        <div class="detail-item">
                            <div class="detail-label">Humidity</div>
                            <div class="detail-value">${current.humidity}%</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Wind Speed</div>
                            <div class="detail-value">${current.windSpeed} km/h</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Pressure</div>
                            <div class="detail-value">${current.pressure} hPa</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Visibility</div>
                            <div class="detail-value">${current.visibility} km</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">UV Index</div>
                            <div class="detail-value">${current.uvIndex}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="forecast-section">
                <h2 class="forecast-title">5-Day Forecast</h2>
                <div class="forecast-grid">
                    ${forecast.map(day => `
                        <div class="forecast-item">
                            <div class="forecast-day">${day.day}</div>
                            <div class="forecast-icon">${getWeatherIcon(day.description)}</div>
                            <div class="weather-description">${day.description}</div>
                            <div class="forecast-temps">
                                <span class="high-temp">${day.high}°</span>
                                <span class="low-temp">${day.low}°</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

   async function searchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    showLoading();

    try {
        // 1. Get current weather
        const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
        if (!currentRes.ok) throw new Error('City not found');

        const currentData = await currentRes.json();

        // 2. Get 5-day forecast
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        if (!forecastRes.ok) throw new Error('Could not fetch forecast');

        const forecastData = await forecastRes.json();

        // Group forecast data by day
        const forecastMap = new Map();
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toLocaleDateString('en-US', { weekday: 'long' });
            if (!forecastMap.has(day)) {
                forecastMap.set(day, {
                    temps: [],
                    descriptions: []
                });
            }
            forecastMap.get(day).temps.push(item.main.temp);
            forecastMap.get(day).descriptions.push(item.weather[0].description);
        });

        // Remove today's duplicate
        const forecast = Array.from(forecastMap.entries()).slice(1, 6).map(([day, data]) => {
            const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
            const high = Math.max(...data.temps);
            const low = Math.min(...data.temps);
            const description = data.descriptions[Math.floor(data.descriptions.length / 2)];
            return { day, description, high: Math.round(high), low: Math.round(low) };
        });

        const weatherData = {
            current: {
                city: `${currentData.name}, ${currentData.sys.country}`,
                temperature: Math.round(currentData.main.temp),
                description: currentData.weather[0].description,
                humidity: currentData.main.humidity,
                windSpeed: Math.round(currentData.wind.speed * 3.6),
                pressure: currentData.main.pressure,
                visibility: Math.round(currentData.visibility / 1000),
                uvIndex: 'N/A' // not available without OneCall
            },
            forecast
        };

        displayWeather(weatherData);

    } catch (error) {
        console.error(error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
    }
}

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by this browser');
            return;
        }

        showLoading();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${API_KEY}&units=metric`);
                    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');

                    const weatherData = await weatherResponse.json();

                    let locationName = 'Your Current Location';
                    const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
                    if (geoResponse.ok) {
                        const geoData = await geoResponse.json();
                        if (geoData.length > 0) {
                            locationName = `${geoData[0].name}, ${geoData[0].country}`;
                        }
                    }

                    const transformedData = transformWeatherData(weatherData, locationName);
                    displayWeather(transformedData);
                } catch (error) {
                    showError('Failed to fetch weather for your location');
                }
            },
            (error) => {
                let message = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                showError(message);
            }
        );
    }

    document.getElementById('cityInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });

    window.addEventListener('load', () => {
        document.getElementById('cityInput').value = 'London';
        searchWeather();
    });

    // Expose to global for button onclick handlers (optional)
    window.searchWeather = searchWeather;
    window.getCurrentLocation = getCurrentLocation;
});
