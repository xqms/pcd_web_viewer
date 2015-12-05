
/*
 * Try to stream a file from a specified URI.
 *
 * In Chrome, this uses the fetch API with streaming. Firefox has a special
 * moz-chunked-arraybuffer XHR request. Other browsers will use multiple
 * requests using the Content-Range header.
 */

function checkXHRSupport(type) {
	var xhr = new XMLHttpRequest();
	// If location.host is empty, e.g. if this page/worker was loaded
	// from a Blob, then use example.com to avoid an error
	xhr.open('GET', location.host ? '/' : 'https://example.com');

	try {
		xhr.responseType = type;
		return xhr.responseType === type;
	} catch (e) {}

	return false;
}

function parseContentRange(str) {
	var matches;

	if (matches = str.match(/^(\w+) (\d+)-(\d+)\/(\d+|\*)/)) return {
		unit: matches[1],
		first: +matches[2],
		last: +matches[3],
		length: matches[4] === '*' ? null : +matches[4]
	};

	if (matches = str.match(/^(\w+) \*\/(\d+|\*)/)) return {
		unit: matches[1],
		first: null,
		last: null,
		length: matches[2] === '*' ? null : +matches[2]
	};

	return null;
}

function streamURI(uri, options)
{
	var filesize = 0;
	var offset = 0;

	var CHUNK = options.chunk || (150 * 1024); // 150k = 10240 points

	function handleRangeArrayBuffer(buffer, status, xhr) {
		var contentRangeHeader = xhr.getResponseHeader('Content-Range');
		if(contentRangeHeader != null)
		{
			var items = parseContentRange(contentRangeHeader);
			filesize = parseInt(items['length']);
		}

		options.data(buffer, filesize);
		offset += CHUNK;

		if(offset >= filesize)
		{
			if(options.success)
				options.success();
		}
		else
		{
			$.ajax({
				url: uri,
				type: 'GET',
				dataType: 'binary',
				processData: false,
				responseType: 'arraybuffer',
				headers: {Range: 'bytes=' + offset + '-' + (offset+CHUNK-1)},
				success: handleRangeArrayBuffer
			});
		}
	}

	if(typeof(fetch) == 'function' && typeof(ReadableByteStream) == 'function')
	{
		// Chrome

		fetch(uri, {
			method: 'GET',
			mode: 'same-origin',
			credentials: 'same-origin'
		}).then(function (response) {
			if(response.headers.has('Content-Length'))
				filesize = parseInt(response.headers.get('Content-Length'));

			var reader = response.body.getReader();

			function pump(reader) {
				return new Promise(function (resolve, reject) {
					function pumpStep() {
						reader.read().then(function (result) {
							if (result.done) {
								console.log('done');
								// Remove the progressbar
								$("#progressbar-container").hide();
								$("#controls-browser").show();

								return;
							}

							options.data(result.value.buffer, filesize);

							pumpStep(reader);
						});
					}
					pumpStep();
				});
			}

			pump(reader);
		}, function (reason) {
			console.log('fetch error', reason);
		});
	}
	else if(checkXHRSupport('moz-chunked-arraybuffer'))
	{
		// Firefox

		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'binary',
			processData: false,
			responseType: 'moz-chunked-arraybuffer',
			success: function() {
				if(options.success)
					options.success();
			},
			onprogress: function(e) {
				var contentLengthHeader = e.target.getResponseHeader('Content-Length');
				if(contentLengthHeader != null)
					filesize = parseInt(contentLengthHeader);

				options.data(e.target.response, filesize);
			}
		});
	}
	else
	{
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'binary',
			processData: false,
			responseType: 'arraybuffer',
			headers: {Range: 'bytes=' + offset + '-' + (offset+CHUNK-1)},
			success: handleRangeArrayBuffer
		});
	}
}
