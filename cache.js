/***************************************************
Titanium mCache

Joe Maffia
http://about.me/joemaffia

A cache module to be used for Titanium app. http://www.appcelerator.com/
It uses the local SQLite database to cache strings and JavaScript objects.

Usage:
	// A simple call to get the cached object, will return NULL if empty
	var cachedObj = Ti.App.mCache.get('foo');

	// How to cache a new object. By default will stay in cache for 5seconds
	// otherwise change the CACHE_EXPIRATION_INTERVAL or pass the parameter to the call.
	var aNewObject = { property: 'value' };
	Ti.App.mCache.put('foo', aNewObject);

	// setting the cache expiring time to 1min
	Ti.App.mCache.put('foo', aNewObject, 60);

	// Delete the object from the cache...we don't wanna wait the expiring time.
	Ti.App.mCache.del('foo');
***************************************************/

(function(){
	
	var CONFIG = {
		// Disables cache (development purpose).
		DISABLE: false,
		
		// Objects will be deleted after this interval. (seconds)
		CACHE_EXPIRATION_INTERVAL: 5
	};
	
	Ti.App.mCache = function() {
		var initCache, expireCache, currentTimestamp, get, put, del;

		// Cache initialization
		initCache = function(cache_expiration_interval) {
			var db = Titanium.Database.open('cache');
			db.execute('CREATE TABLE IF NOT EXISTS cache (key TEXT UNIQUE, value TEXT, expiration INTEGER)');
			db.close();
			Ti.API.info('[CACHE] INITIALIZED');
			
			if (!CONFIG) {
				// set cache expiration task
				setInterval(expireCache, cache_expiration_interval * 1000);
				Ti.API.info('[CACHE] Will expire objects each ' + cache_expiration_interval + ' seconds');
			}
		};

		expireCache = function() {
			var db = Titanium.Database.open('cache');
			var timestamp = currentTimestamp();

			// count how many objects will be deleted
			var count = 0;
		    var rs = db.execute('SELECT COUNT(*) FROM cache WHERE expiration <= ?', timestamp);
		    while (rs.isValidRow()) {
		        count = rs.field(0);
		        rs.next();
		    }
		    rs.close();

			// deletes everything older than timestamp
			db.execute('DELETE FROM cache WHERE expiration <= ?', timestamp);
			db.close();

			Ti.API.debug('[CACHE] EXPIRATION: [' + count + '] object(s) expired');
		};

		currentTimestamp = function() {
			var value = Math.floor(new Date().getTime() / 1000);
			Ti.API.debug("[CACHE] currentTimestamp=" + value);
			return value;
		};

		get = function(key) {
			var db = Titanium.Database.open('cache');
			
			var rs = db.execute('SELECT value FROM cache WHERE key = ?', key);
			var result = null;
			if (rs.isValidRow()) {
				Ti.API.info('[CACHE] GET: key[' + key + ']');
				result = JSON.parse(rs.fieldByName('value'));
			} else {
				Ti.API.info('[CACHE] Missed: key[' + key + ']');				
			}
			rs.close();
			db.close();
			
			return result;
		};

		put = function(key, value, expiration_seconds) {
			if (!expiration_seconds) {
				expiration_seconds = 300;
			}
			var expires_in = currentTimestamp() + expiration_seconds;
			var db = Titanium.Database.open('cache');
			Ti.API.info('[CACHE] PUT: time=' + currentTimestamp() + ', expires_in=' + expires_in);
			var query = 'INSERT OR REPLACE INTO cache (key, value, expiration) VALUES (?, ?, ?);';
			db.execute(query, key, JSON.stringify(value), expires_in);
			db.close();
		};

		del = function(key) {
			var db = Titanium.Database.open('cache');
			db.execute('DELETE FROM cache WHERE key = ?', key);
			db.close();
			Ti.API.info('[CACHE] DEL: key[' + key + ']');
		};

		return function() {
			// if development environment, disable cache capabilities
			if (CONFIG && CONFIG.DISABLE) {
				return {
					get: function(){},
					put: function(){},
					del: function(){}
				};
			}

			// initialize everything
			var cache_expiration_interval = 5;
			if (CONFIG && CONFIG.CACHE_EXPIRATION_INTERVAL) {
				cache_expiration_interval = CONFIG.CACHE_EXPIRATION_INTERVAL;
			}

			initCache(cache_expiration_interval);

			return {
				get: get,
				put: put,
				del: del
			};
		}();
		
	}(CONFIG);
	
})();