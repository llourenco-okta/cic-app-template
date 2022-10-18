import hljs from 'highlight.js';
import { eachElement, elementMapper } from './utils';

// Global app state handling;
const defaultLoadingTitle = 'Hang tight!';
const defaultLoadingMsg = 'The monkeys are working.';

export let appState = {
	apiData: undefined,
	isLoading: true,
	loadingTitle: defaultLoadingTitle,
	loadingMsg: defaultLoadingMsg,
};

export default new Proxy(appState, {
	set: (target, key, value) => {
		target[key] = value;

		switch (key) {
			case 'apiData':
				const responseElement =
					document.getElementById('api-call-result');

				if (value) {
					// responseElement.innerText = value;
					responseElement.innerHTML = JSON.stringify(value, null, 2);

					eachElement('.result-block', (element) =>
						element.classList.add('show')
					);

					window.location.hash = '#anchor-results';
				} else {
					responseElement.innerHTML = '';
				}
				break;

			case 'isLoading':
				document.querySelectorAll('.x-loader').forEach((element) => {
					if (value) {
						element.classList.add('show');
						element.classList.remove('hide');
					} else {
						element.classList.add('hide');
						element.classList.remove('show');
					}
				});
				break;
			// Set innerHTML
			case 'loadingMsg':
			case 'loadingTitle':
				document.getElementById(elementMapper[key]).innerHTML = value;
				break;
			default:
				break;
		}

		hljs.highlightAll();
		// document.querySelectorAll('pre code').forEach(hljs.highlightBlock);

		return true;
	},
});
