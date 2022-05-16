<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	import img_check from '../assets/check.png';
	import img_clouds from '../assets/clouds.png';
	import img_checking from '../assets/checking.png';
	import img_bitcoin from '../assets/bitcoin.svg';
	import img_sad from '../assets/sad.png';
	import img_happy from '../assets/happy.png';
	import { DateInput } from 'date-picker-svelte';
	let startDate = new Date('2021-01-24T06:00:00.000');
	let maxDate = new Date();
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
	let isGrowing = false;

	onMount(resize);

	function resize() {
		({ width, height } = svg.getBoundingClientRect());
		getData();
	}

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
			.then((data) => renderData(data));
	}

	function analyseData(data) {
		const [min, max] = d3.extent([...data.map((d) => d.priceUsd), 0]);
		const blur = Math.ceil(data.length / 23);
		const blurredData = [];
		for (let i = blur; i < data.length; i++) {
			blurredData.push({
				date: data[i].date,
				priceUsd: data.slice(i - blur, i).reduce((ac, v, i) => ac + (i * v.priceUsd) / blur, 0),
				index: i
			});
		}
		const hills = [data.slice(0, blur)];
		blurredData.reduce(
			(ac, v, i) => {
				if (i === blurredData.length - 1) {
					hills.push(data.slice(ac.startIndex + blur));
				}
				if (v.priceUsd > blurredData[i > 0 ? i - 1 : i].priceUsd) {
					if (!ac.growing && i - ac.startIndex > blur) {
						hills.push(data.slice(ac.startIndex + blur, i + blur));

						return {
							startIndex: i,
							peakIndex: i,
							peakValue: Number.MIN_SAFE_INTEGER,
							growing: true
						};
					}
					if (v.priceUsd > ac.peakValue) {
						return {
							...ac,
							peakIndex: i,
							peakValue: v.priceUsd,
							growing: true
						};
					}
				}
				return {
					...ac,
					growing: false
				};
			},
			{
				startIndex: 0,
				peakIndex: 0,
				peakValue: Number.MIN_SAFE_INTEGER,
				growing: true
			}
		);

		isGrowing =
			data[0].priceUsd < data[data.length - 1].priceUsd && hills[hills.length - 1].priceUsd;

		const points = [];
		hills.forEach((h) => {
			const min = d3.minIndex(h.map((h) => h.priceUsd));
			const max = d3.maxIndex(h.map((h) => h.priceUsd));
			min > max ? points.push(h[max], h[min]) : points.push(h[min], h[max]);
		});

		const optimizedPoints = points.reduce((ac, p, i) => {
			if (i === 0 || i > points.length - 2) {
				return { ...ac, [p.date]: p };
			}
			if (
				(p.priceUsd > points[i - 1].priceUsd && p.priceUsd > points[i + 1].priceUsd) ||
				(p.priceUsd < points[i - 1].priceUsd && p.priceUsd < points[i + 1].priceUsd)
			) {
				return { ...ac, [p.date]: p };
			}
			return ac;
		}, {});

		const res = [[]];
		let skyline = [];
		let buf = [];

		data.forEach((p, i) => {
			if ((!!optimizedPoints[`${p.date}`] && buf.length) || i == data.length - 1) {
				buf.push(p);
				let buf2 = [];
				if (buf[0].priceUsd > p.priceUsd) {
					const downLine = Math.floor(Math.random() * buf.length * 0.7);
					buf2 = buf.slice(0, downLine).map((p, i) => ({
						date: new Date(
							p.date.getTime() + buf[buf.length - 1].date.getTime() - buf[0].date.getTime()
						),
						priceUsd: p.priceUsd + buf[buf.length - 1].priceUsd - buf[0].priceUsd
					}));
				}
				const skylinePart = buf.filter((p, i) =>
					i == 0 || i == buf.length - 1 ? 1 : Math.random() > 0.6
				);
				res.push([...skylinePart, ...buf2]);
				skyline.push(...skylinePart);
				buf = [];
			}
			buf.push(p);
		});
		return { data, lines: [...res], skyline };
	}

	let line = d3
		.line()
		.x((d) => xScale(d[0]))
		.y((d) => yScale(d[1]));

	function renderData({ data, lines, skyline }) {
		const plot = d3.select(svg).selectChild('#plot');
		const hills = d3.select(svg).selectChild('#hills');
		const hills2 = d3.select(svg).selectChild('#hills2');
		const [minV, maxV] = d3.extent([...data.map((d) => d.priceUsd), 0]);
		const [minD, maxD] = d3.extent([...data.map((d) => d.date)]);

		xScale.domain([minD, maxD]);
		yScale.domain([minV, maxV]);
		renderHills(hills, lines, skyline);
		renderHills(hills2, lines, skyline);
		renderPlot(plot, data);
	}

	function renderHills(hills, lines, skyline) {
		hills
			.selectAll('path.skyline')
			.data([skyline], (p) => p.date)
			.join(
				(enter) => {
					const res = enter.append('path').attr('class', 'enter skyline');
					setTimeout(() => {
						res.attr('class', 'entered skyline');
					}, 1);
					return res;
				},
				(update) => update.attr('class', 'update skyline'),
				(exit) => {
					exit.attr('class', 'exit skyline');
					setTimeout(() => exit.remove(), 400);
				}
			)
			.attr('d', (d) =>
				line([
					[xScale.invert(0), yScale.invert(300)],
					...d.map((p) => [p.date, p.priceUsd]),
					[xScale.invert(300), yScale.invert(300)]
				])
			)
			.attr('stroke-width', (d, i) => (lines.length * 2 - i) / lines.length);

		hills
			.selectAll('path.peaks')
			.data(lines, (p) => p.date)
			.join(
				(enter) => {
					const res = enter.append('path').attr('class', 'enter peaks');
					setTimeout(() => {
						res.attr('class', 'entered peaks');
					}, 1);
					return res;
				},
				(update) => update.attr('class', 'update peaks'),
				(exit) => {
					exit.attr('class', 'exit ');
					setTimeout(() => exit.remove(), 400);
				}
			)
			.attr('d', (d) => line(d.map((p) => [p.date, p.priceUsd])))
			.attr('stroke-width', (d, i) => (lines.length * 3 - i) / lines.length);
	}

	function renderPlot(plot, data) {
		plot
			.selectAll('path.currency')
			.data([data])
			.join(
				(enter) => {
					const res = enter.append('path').attr('class', 'enter currency');
					setTimeout(() => {
						res.attr('class', 'entered currency');
					}, 1);
					return res;
				},
				(update) => update.attr('class', 'update currency'),
				(exit) => {
					exit.attr('class', 'exit currency');
					setTimeout(() => exit.remove(), 400);
				}
			)
			.attr('d', (d) => line(d.map((p) => [p.date, p.priceUsd])));
	}
</script>

<svelte:window on:resize={resize} />
<div class="flex">
	<div>When did you invest into bitcoin?</div>
	<DateInput bind:value={startDate} bind:closeOnSelection bind:max={maxDate} on:select={getData} />
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
		<image id="clouds" href={img_clouds} height="300" width="300" />
	</defs>
	<use href="#clouds" x="0" y="300" />
	<use href="#clouds" x="300" y="0" />

	<g id="hills" class="hills" transform="translate(300, 10)" />
	<use href="#hills" x="-300" y="300" />
	<g id="plot" transform="translate(0,310)" />
	<line x1="0" y1="360" x2="300" y2="360" />
	<line x1="0" y1="400" x2="300" y2="400" />
	<line x1="0" y1="440" x2="300" y2="440" />
	<line x1="0" y1="480" x2="300" y2="480" />
	<image href={img_check} height="300" width="300" />
	<image href={img_checking} height="300" width="300" x="0" y="300" />
	<image href={img_checking} height="300" width="300" x="300" y="0" />
	<image href={img_bitcoin} height="23" width="23" x="270" y="340" />
	<image href={isGrowing ? img_happy : img_sad} height="300" width="300" x="300" y="300" />
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
				opacity: 0.9;
			}

			&.currency {
				stroke: red;
				stroke-width: 4;
				opacity: 0.8;
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
