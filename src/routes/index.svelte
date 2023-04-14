<script>
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	import { analyseData, renderData } from '$lib/data';
	import { DateInput } from 'date-picker-svelte';
	import img_bitcoin from '../assets/bitcoin.svg';
	import img_check from '../assets/check_out.svg';
	import img_checking from '../assets/checking.svg';
	import clouds from '../assets/clouds.svg';
	import clouds_backwards from '../assets/clouds_backwards.svg';
	import img_happy from '../assets/happy.svg';
	import img_desperate from '../assets/desperate.svg';
	import img_suspect from '../assets/suspect.svg';
	import { MOOD_IMAGE } from '$lib/model';

	let startDate = new Date('2021-01-24T06:00:00.000');
	let maxDate = new Date();
	maxDate.setDate(maxDate.getDate() - 3);
	let closeOnSelection = true;

	let range = [
		[0, 0],
		[new Date(), new Date()]
	];

	let svg;
	let width = 300;
	let height = 120;
	let xScale = d3.scaleLinear().domain(range[0]).range([0, width]);
	let yScale = d3.scaleTime().domain(range[1]).range([height, 0]);
	let moodImg = img_happy;

	onMount(resize);

	function resize() {
		({ width, height } = svg.getBoundingClientRect());
		getData();
	}

	const line = d3
		.line()
		.x((d) => xScale(d[0]))
		.y((d) => yScale(d[1]));

	function getData() {
		return fetch(
			`https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startDate.getTime()}&end=${new Date().getTime()}`,
			{
				method: 'GET',
				redirect: 'follow'
			}
		)
			.then((data) => data.json())
			.then((data) =>
				data.data.map((item) => ({
					date: new Date(item.date),
					priceUsd: +item.priceUsd
				}))
			)
			.then((d) => analyseData(d))
			.then((data) => {
				renderData(svg, xScale, yScale, line, data);
				console.log(data.moodImg);
				switch (data.moodImg) {
					case 0: {
						moodImg = img_happy;
						break;
					}
					case 1: {
						moodImg = img_desperate;
						break;
					}
					default:
						moodImg = img_suspect;
				}
			});
	}
</script>

<svelte:window on:resize={resize} />
<div class="flex">
	<div>When did you invest? &nbsp;</div>
	<div>
		<DateInput
			bind:value={startDate}
			bind:closeOnSelection
			bind:max={maxDate}
			on:select={getData}
			format="yyyy-MM-dd"
		/>
	</div>
</div>
<svg bind:this={svg}>
	<defs>
		<linearGradient id="gradient" gradientTransform="rotate(270, 0.5, 0.5)">
			<stop offset="0%" stop-color="#62b03e" />
			<stop offset="33%" stop-color="#62b03e" />
			<stop offset="33%" stop-color="#62b03e" />
			<stop offset="33%" stop-color="black" />
			<stop offset="33.5%" stop-color="black" />
			<stop offset="33.5%" stop-color="green" />

			<stop offset="44%" stop-color="green" />
			<stop offset="44%" stop-color="black" />
			<stop offset="44.5%" stop-color="black" />
			<stop offset="44.5%" stop-color="rgba(126, 126, 130, 1)" />
			<stop offset="77%" stop-color="rgba(126, 126, 130, 1)" />
			<stop offset="90%" stop-color="rgba(255, 255, 255, 1)" />
			<stop offset="100%" stop-color="rgba(255, 255, 255, 1)" />
		</linearGradient>
		<rect id="frame" x="0" y="0" width="300" height="300" />
	</defs>

	<image href={clouds_backwards} height="300" width="300" x="0" y="0" />
	<image href={clouds} height="300" width="300" x="0" y="300" />
	<image href={clouds} height="300" width="300" x="300" y="0" />
	<image href={clouds_backwards} height="300" width="300" x="300" y="300" />

	<g id="hills" class="hills" transform="translate(300, 30)" />
	<use href="#hills" x="-300" y="300" />
	<g id="plot" transform="translate(0,330)" />
	<line x1="0" y1="360" x2="300" y2="360" />
	<line x1="0" y1="400" x2="300" y2="400" />
	<line x1="0" y1="440" x2="300" y2="440" />
	<line x1="0" y1="480" x2="300" y2="480" />
	<image href={img_check} height="300" width="300" />
	<image href={img_checking} height="300" width="300" x="0" y="320" />
	<image href={img_checking} height="300" width="300" x="300" y="0" />
	<image href={moodImg} height="300" width="300" x="300" y="300" />
	<image href={img_bitcoin} height="23" width="23" x="272" y="310" />
	<rect id="mainFrame" x="0" y="0" width="600" height="600" />
	<use href="#frame" x="0" y="0" />
	<use href="#frame" x="0" y="300" />
	<use href="#frame" x="300" y="0" />
	<use href="#frame" x="300" y="300" />
</svg>

<style lang="scss" global>
	svg {
		width: 600px;
		height: 600px;
		user-select: none;

		path {
			fill: transparent;
			stroke-linecap: round;
			stroke-linejoin: round;

			&.peaks {
				stroke: black;
			}

			&.skyline {
				fill: url('#gradient');
				opacity: 1;
			}

			&.currency {
				stroke: orange;
				stroke-width: 3;
				opacity: 1;
			}
		}
		rect {
			stroke: black;
			stroke-width: 4;
			fill: transparent;
		}
		#mainFrame {
			stroke-width: 8;
		}

		line {
			stroke: orange;
			stroke-width: 1;
			opacity: 0.5;
		}
	}

	.flex {
		display: flex;
		margin: 2em auto;
		justify-content: center;
		align-items: center;
		text-align: center;

		width: 100%;
	}
</style>
