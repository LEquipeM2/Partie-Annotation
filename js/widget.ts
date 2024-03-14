import type { AnyModel, RenderContext } from "@anywidget/types";
import "./widget.css";
import WaveSurfer from "wavesurfer.js";
import Regions from 'wavesurfer.js/dist/plugins/regions.js'
import Minimap from 'wavesurfer.js/dist/plugins/minimap.js'
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";


// @ts-ignore Import module
//import WaveSurfer from 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js';
// @ts-ignore Import module
//import RegionsPlugin from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js'

/* Specifies attributes defined with traitlets in ../src/pyannotebook_reborn/__init__.py */
interface WidgetModel {
	value: number;
	audio_64: string;
	regions : any;
	timelines : any
}

export function render({ model, el }: RenderContext<WidgetModel>) {
	model.on("change:regions", on_change_annotation);
	model.on("change:timelines", on_change_timelines);

	let changed_for_python:boolean = false;
	let ascii_code:number = 65;
	let dict: Map<String, String> = new Map();
	let color_colection : Array<String> = new Array();

	// Color -> {Person -> List(Regions)}

	let minimap = document.createElement("div");
	el.appendChild(minimap);
	let cont = document.createElement("div");
	el.appendChild(cont);

	let cont_labels = document.createElement("div");
	el.appendChild(cont_labels);
	
	//var decoded = atob(model.get(audio_64));

	//decode audio
	let audio = new Audio("data:audio/wav;base64," + model.get("audio_64"))
	audio.controls=true;
	audio.volume=0.1;
	//el.appendChild(audio);
	//audio.addEventListener('loadeddata', () => { audio.play(); })
	cont.id = "waveform";

	const wavesurfer = WaveSurfer.create({
		container: cont,
		waveColor: '#4F4A85',
		progressColor: '#383351',
		media: audio,
		barGap: 1,
		barHeight: 1,
		barRadius: 2,
		barWidth: 2,
		plugins: [
			// Register the plugin
			Minimap.create({
				height: 20,
				waveColor: '#4F4A85',
				progressColor: '#383351',
				container: minimap,
				barGap: 1,
				barHeight: 1,
				barRadius: 2,
				barWidth: 2,
			}),
			TimelinePlugin.create()
		],
	})

	wavesurfer.on('ready', () =>{
		wavesurfer.zoom(50);
		/*wsTimelines.addRegion({
			color: "#D42A23",
			start: 20,
			end: 25,
			drag: false,
    		resize: false,
		})
		wsTimelines.getRegions().forEach((r) => {
			r.element.part.add("timeline")
		})*/
	});
	  
	wavesurfer.on('click', () => {
		/*if (!click_bool)
			wavesurfer.play()
		else wavesurfer.pause()
		click_bool=!click_bool;*/
	})

	// Create a simple slider
	let div_zoom = document.createElement("button");
	let zoom_text = document.createElement('text');
	let zoom = document.createElement("input");

	zoom_text.style.margin="5px";
	zoom.style.margin="5px";
	zoom_text.textContent="Zoom :"
	zoom.setAttribute('type', "range");
	zoom.setAttribute('min', "10");
	zoom.setAttribute('max', "1000");
	zoom.setAttribute('value', "10");
	div_zoom.appendChild(zoom_text);
	div_zoom.appendChild(zoom);
	el.appendChild(div_zoom);

	// Update the zoom level on slider change
	wavesurfer.once('decode', () => {
		const slider = document.querySelector('input[type="range"]') as HTMLElement
	  
		slider.addEventListener('input', (e:any) => {
			const minPxPerSec = e.target.valueAsNumber
			wavesurfer.zoom(minPxPerSec)
		})
	});

	// Test btn
	let btn = document.createElement("button");
	btn.classList.add("pyannotebook_reborn-counter-button");
	btn.innerHTML = `Change Color (Random)`;
	btn.addEventListener("click", () => {
		if (activeButton!=null){
			wsRegions.getRegions().forEach((r) => {
				let tmp = activeButton.querySelectorAll("span");
				console.log(tmp)
				tmp.forEach((b:any) => {
					if (b.className=="label-shortcut"){
						console.log("yes")
						let letter = b.textContent;
						let tmp_color = randomColor();
						wsRegions.getRegions().forEach((r) => {
							console.log(r.content?.innerHTML);
							if (r.content?.innerHTML==letter){
								console.log("No?")
								r.setOptions({
									content: letter,
									color: tmp_color,
									start: r.start,
								})
								activeButton.style.backgroundColor=tmp_color;
							}
						});
					}
				});
			});
			update();
		}
	});
	el.appendChild(btn);


	// Initialize the Regions plugin
	const wsRegions = wavesurfer.registerPlugin(Regions.create());
	const wsTimelines = wavesurfer.registerPlugin(Regions.create());

	// Give regions a random color when they are created
	const random = (min: number, max: number): number => Math.random() * (max - min) + min;
	const randomColor = (): string => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`;

	wsRegions.enableDragSelection({
		color: randomColor(),
	});

	wsRegions.on('region-updated', (region): void => {
		changed_for_python=true;
		console.log('Updated region', region);
		model.set("regions", update_regions());
		model.save_changes();
		changed_for_python=false;
		update();

	});

	wsRegions.on('region-created', (region): void => {
		console.log('Created region', region);
		console.log("Region created : ", region.content);
		let tmp_color:any = "rgba(57.65808603252993, 196.2968277849842, 172.98499775381188, 0.5)";

		let content = String.fromCharCode(ascii_code);
		let exist_label:boolean = false;

		if (region.content!=null){
			content=region.content.innerText;
			console.log("CONTENT = ", content);
		}
		console.log("dict = ", dict, " keys = ", dict.keys());
		for (const [key, color] of dict){
			console.log("Key = ", key, " content = ", content);
			if (key==content){
				exist_label = true;
				tmp_color = color;
			}
		}

		region.setOptions({
			content: content,
			color: tmp_color,
			start: region.start,
		})
		
		if (!exist_label){
			// Determine new color
			console.log("COLOR GOING TO CHANGE : ", tmp_color);
			while (color_colection.includes(tmp_color)){
				tmp_color = randomColor();
			}
			region.setOptions({
				content: content,
				color: tmp_color,
				start: region.start,
			})

			console.log("COLOR CHANGED : ", tmp_color);

			// Create new Label div 
			let div_region = document.createElement('button');
			div_region.classList.add('label-button');
			div_region.style.backgroundColor=region.color;

			let shortcut = document.createElement('span');
			let input_label = document.createElement('input');

			shortcut.style.backgroundColor = 'white';
			shortcut.classList.add('label-shortcut');
			shortcut.textContent = content;
			div_region.appendChild(shortcut);

			input_label.classList.add('label-input');
			input_label.value=content;
			div_region.appendChild(input_label);

			cont_labels.appendChild(div_region);
			div_region.addEventListener('click', () => {
				activeButton=div_region;
				if (!div_region.className.includes("label-button-active")){
					var buttons = document.querySelectorAll("button");
					buttons.forEach((b) => {
						if (b.className.includes("label-button")){
							console.log(b)
							b.classList.remove("label-button-active")
							activeButton=null;
						}
					});
				
					div_region.classList.add('label-button-active');
					activeButton=div_region;
					if (activeRegion!=null){
						wsRegions.getRegions().forEach((r) => {
							if (r==activeRegion){
								if (shortcut.textContent!=null){
									r.setOptions({
										content: shortcut.textContent,
										color: div_region.style.backgroundColor,
										start: r.start,
									})
									console.log(div_region.style.backgroundColor)
									console.log(shortcut.textContent)
								}
								activeRegion=null;
							}
						});
					}
				}
				else{
					if (activeRegion==null){
						div_region.classList.remove("label-button-active");
						div_region.classList.add("label-button");
						activeButton=null;
					}
				}
			
				//activeRegion=null;
			});

			dict.set(content.toUpperCase(), region.color);
			color_colection.push(region.color);
		}
		update();
	});

	// Loop a region on click
	let loop: boolean = false;

	// Toggle looping with a checkbox
	document.querySelector('input[type="checkbox"]')?.addEventListener("click", (e: Event): void => {
		loop = (e.target as HTMLInputElement).checked;
	});

	let activeRegion:any = null;
	let activeButton:any = null;
	wsRegions.on('region-in', (region) => {
		activeRegion = region;
	});
	wsRegions.on('region-out', (region): void => {
		if (activeRegion === region) {
			if (loop) {
				region.play();
			} else {
				activeRegion = null;
			}
		}
	});
	wsRegions.on('region-clicked', (region, e: Event): void => {
		e.stopPropagation(); // prevent triggering a click on the waveform
		wsRegions.getRegions().forEach((r) => {
            r.element.part.remove("region-active");
        });
		if (activeRegion==region){
			region.element.part.remove("region-active");
			activeRegion=null;
		}
		else{
        	region.element.part.add("region-active");
       		activeRegion = region;
		}
        //region.play();
	});

	// Reset the active region when the user clicks anywhere in the waveform
	wavesurfer.on('interaction', (): void => {
		wsRegions.getRegions().forEach((r) => {
            r.element.part.remove("region-active");
        });
		activeRegion = null;
	});

	// Update the zoom level on slider change
	wavesurfer.once('decode', (): void => {
		document.querySelector('input[type="range"]')?.addEventListener("input", (e: Event): void => {
			const minPxPerSec: number = Number((e.target as HTMLInputElement).value);
			wavesurfer.zoom(minPxPerSec);
		});
	});


	document.addEventListener('keyup', (e) => {
		console.log("Key heyhey")
		if (e.code === "Space"){
			console.log("Space pressed");
			if (!wavesurfer.isPlaying())
				wavesurfer.play()
			else wavesurfer.pause()
		}

		else if (e.code === "Delete" || e.code === "Backspace"){
			console.log("Delete | Backspace pressed");
			if (activeRegion!=null){
				activeRegion.remove();
				activeRegion=null;
			}
		}

		else if (e.code === "Escape") {
			console.log("Escape pressed");
			// Désélectionnez le segment
			if (activeRegion!=null){
				wsRegions.getRegions().forEach((r) => {
					r.element.part.remove("region-active");
				});
				activeRegion = null;
			}
		}

		else if (e.code === "Enter" && e.shiftKey) {
			console.log("Enter | Shift pressed");
			// Divisez la région à l'heure actuelle
			// Assurez-vous de gérer le cas où aucune région n'est sélectionnée
			if (activeRegion!=null){
				if (activeRegion.start < wavesurfer.getCurrentTime() && 
					wavesurfer.getCurrentTime() < activeRegion.end){
					activeRegion.setOptions({
						end : wavesurfer.getCurrentTime(),
					})
				}
			}
		}

		else if (e.code === "Enter") {
			console.log("Enter pressed");
			// Créez une région à l'heure actuelle
			wsRegions.addRegion({
				start: wavesurfer.getCurrentTime(),
				end : wavesurfer.getCurrentTime()+2,
			})
		}

		else if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && e.shiftKey && e.altKey) {
			console.log("Arrow | Shift | Alt pressed");
			// Faites la même chose, mais plus rapidement
			var cout = 0.5;
			if (activeRegion!=null){
				if (e.code === "ArrowLeft" && e.altKey){
					if (activeRegion.start<activeRegion.end-cout)
						activeRegion.end=activeRegion.end-cout;
				}
				else{
					activeRegion.end=activeRegion.end+cout;
				}
			}
		}
	
		else if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && e.shiftKey) {
			console.log("Arrow | Shift pressed");
			console.log(e.code);
			// Faites la même chose, mais plus rapidement
			var cout = 1;
			if (activeRegion!=null){
				if (wavesurfer.isPlaying()){
					if (e.code === "ArrowLeft" && e.shiftKey){
						activeRegion.start=activeRegion.start-cout;
					}
					else{
						activeRegion.start=activeRegion.start+cout;
					}
				}
				else{
					if (e.code === "ArrowLeft" && e.shiftKey){
						wavesurfer.setTime(wavesurfer.getCurrentTime()-cout);
					}
					else{
						wavesurfer.setTime(wavesurfer.getCurrentTime()+cout);
					}
				}
			}
			else{
				if (e.code === "ArrowLeft" && e.shiftKey){
					wavesurfer.setTime(wavesurfer.getCurrentTime()-cout);
				}
				else{
					wavesurfer.setTime(wavesurfer.getCurrentTime()+cout);
				}
			}
		}
	
		else if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && e.altKey) {
			console.log("Arrow | Alt pressed");
			// Modifiez l'heure de fin de la région sélectionnée
			// Assurez-vous de gérer le cas où aucune région n'est sélectionnée
			var cout = 0.1; // A modifier selon la personne
			console.log("Alt appuyé");
			if (activeRegion!=null){
				console.log("Passé ici1");
				if (e.code === "ArrowLeft"){
					console.log(activeRegion.start);
					activeRegion.setOptions({
						start : activeRegion.start-cout,
					})
					activeRegion.element.part.add("region-active");
				}
				else{
					activeRegion.setOptions({
						start : activeRegion.start+cout,
					})
					activeRegion.element.part.add("region-active");
				}
			}
		}

		else if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && !e.altKey && !e.shiftKey) {
			console.log("Arrow pressed");
			// 1. Modifiez l'heure de début de la région sélectionnée (si elle existe)
			// 2. Déplacez le curseur temporel (lorsqu'il est en pause)
			// Assurez-vous de gérer le cas où aucune région n'est sélectionnée
			var cout = 0.5;
			if (wavesurfer.isPlaying()){
				if (activeRegion!=null){
					if (e.code === "ArrowLeft"){
						console.log(activeRegion.start);
						activeRegion.setOptions({
							start : activeRegion.start-cout,
						})
						activeRegion.element.part.add("region-active");
					}
					else{
						activeRegion.setOptions({
							start : activeRegion.start+cout,
						})
						activeRegion.element.part.add("region-active");
					}
				}
			}
			else{
				if (e.code === "ArrowLeft"){
					wavesurfer.setTime(wavesurfer.getCurrentTime()-cout);
				}
				else{
					wavesurfer.setTime(wavesurfer.getCurrentTime()+cout);
				}
			}
		}

		else if (e.code === "Tab" && e.shiftKey) {
			console.log("Tab | Shift pressed");
			let tmp:any = null;
			if (activeRegion==null){
				activeRegion=wsRegions.getRegions()[wsRegions.getRegions.length-1]
				activeRegion.element.part.forEach((e:any) => {
					activeRegion.element.part.remove(e);
				})
				activeRegion.element.part.add("region-active");
				wavesurfer.setTime(activeRegion.start);
			}
			else{
				activeRegion.element.part.forEach((e:any) => {
					activeRegion.element.part.remove(e);
				})
				activeRegion.element.part.add('region');
				console.log(activeRegion.element.part);
				if (0<=wsRegions.getRegions().indexOf(activeRegion)-1){
					tmp=wsRegions.getRegions()[wsRegions.getRegions().indexOf(activeRegion)-1];
					console.log(tmp);
					tmp.element.part.forEach((e:any) => {
						tmp.element.part.remove(e);
					})
					tmp.element.part.add("region-active");
					wavesurfer.setTime(tmp.start);
					activeRegion=tmp;
				}
				else{
					activeRegion=null;
				}
				update();
			}
		}
	
		else if (e.code === "Tab" && !e.shiftKey) {
			console.log("Tab pressed");
			// Sélectionnez le segment suivant
			let tmp:any = null;
			if (activeRegion==null){
				activeRegion=wsRegions.getRegions()[0]
				activeRegion.element.part.forEach((e:any) => {
					activeRegion.element.part.remove(e);
				})
				activeRegion.element.part.add("region-active");
				wavesurfer.setTime(activeRegion.start);
			}
			else{
				activeRegion.element.part.forEach((e:any) => {
					activeRegion.element.part.remove(e);
				})
				activeRegion.element.part.add('region');
				console.log(activeRegion.element.part);
				if (wsRegions.getRegions().indexOf(activeRegion)+1<wsRegions.getRegions().length){
					tmp=wsRegions.getRegions()[wsRegions.getRegions().indexOf(activeRegion)+1];
					console.log(tmp);
					tmp.element.part.forEach((e:any) => {
						tmp.element.part.remove(e);
					})
					tmp.element.part.add("region-active");
					wavesurfer.setTime(tmp.start);
					activeRegion=tmp;
				}
				else{
					activeRegion=wsRegions.getRegions()[0];
					activeRegion.element.part.add("region-active");
					wavesurfer.setTime(activeRegion.start);
				}
			}
			update();
		}
	
		else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
			console.log("Arrow Up/Down pressed");
			// Zoom avant/arrière (en cours de développement)
		}

		else if ((e.code>="A" && e.code<="Z") || (e.code>="a" && e.code<="z")){
			console.log("Letter pressed : ", e.key);
			if (activeRegion!=null){
				wsRegions.addRegion({
					start: activeRegion.start,
					end : activeRegion.end,
					id : activeRegion.id,
					content: e.key.toUpperCase()
				})
				activeRegion.remove();
				activeRegion=null;
			}
			console.log("Letter = ", e.code)
			update();
		}
		else{
			console.log("Nothing happenned");
		}
		e.stopPropagation()
	});

	// Test btn
	let btnEnter = document.createElement("button");
	btnEnter.classList.add("pyannotebook_reborn-counter-button");
	btnEnter.innerHTML = `Shift Enter`;
	btnEnter.addEventListener("click", () => {
		if (activeRegion!=null){
			if (activeRegion.start < wavesurfer.getCurrentTime() && 
					wavesurfer.getCurrentTime() < activeRegion.end){
				let end_tmp:number = activeRegion.end;
				activeRegion.setOptions({
					end : wavesurfer.getCurrentTime(),
				})
				wsRegions.addRegion({
					start: wavesurfer.getCurrentTime(),
					content: "new",
					color: randomColor(),
					end : end_tmp,
				})
			}
		}
	});
	el.appendChild(btnEnter);

	function update(){
		let tab_r:any[] = [];

		wsRegions.getRegions().sort((a,b) => (a.start>b.start)?1:-1).forEach((r) => {
			r.element.part.forEach((e) => {
				r.element.part.remove(e);
			})
			r.element.part.add("region");
			let tmp:any[] = [];
			wsRegions.getRegions().sort((a,b) => (a.start>b.start)?1:-1).forEach((r2) => {
				if ((r2.start <= r.end) && (r.start <= r2.end)){
					r2.element.part.forEach((e) => {
						r2.element.part.remove(e);
					})
					r2.element.part.add("region");
					tmp.push(r2);
				}
			});
			tab_r.push(tmp);
		});

		tab_r.forEach((tab) => {
			let len = tab.length;
			let i = 1;
			tab.sort((a:any,b:any) => (a.start>b.start)?1:-1).forEach((r: any) => {
				let action = true;
				r.element.part.forEach((e: string) => {
					if (e.includes("overlapping")){
						console.log("Yo? slt")
						action = false;
					}
				});
				if (action){
					tab.sort((a:any,b:any) => (a.start>b.start)?1:-1).forEach((r2: any) => {
						r2.element.part.forEach((e: string) => {
							if (e==("overlapping-" + String(i) + "-" + String(len))){
								i+=1;
							}
							else{
								r.element.part.add("overlapping-" + String(i) + "-" + String(len));
							}
						});
					});
				}
			});
		});

		console.log(tab_r);
	}

	// Test btn
	let btnUpdate = document.createElement("button");
	btnUpdate.classList.add("pyannotebook_reborn-counter-button");
	btnUpdate.innerHTML = `Update test`;
	btnUpdate.addEventListener("click", () => {
		update();
	});
	el.appendChild(btnUpdate);

	function update_regions(){
		let regions_list:any[] = []
		wsRegions.getRegions().sort((a,b) => (a.start>b.start)?1:-1).forEach((r) => {
			regions_list.push(
				{
					"start": r.start,
					"end": r.end,
					"id": r.id,
					"label": r.content?.innerText
				});
		});
		console.log("Regions list = ", regions_list);
		model.set("regions", regions_list);
		model.save_changes();
	}

	function on_change_annotation(){
		if (!changed_for_python){
			let regions_list = model.get("regions");
			wsRegions.getRegions().sort((a,b) => (a.start>b.start)?1:-1).forEach((r) => {
				r.remove()
			});
			regions_list.forEach((r:any) => {
				console.log("Region_list = ", r);
				wsRegions.addRegion({
					start: r['start'],
					end : r['end'],
					id : r['id'],
					content: r['label'].toUpperCase()
				})
			});
		}
	}

	function on_change_timelines(){
		wsTimelines.clearRegions();
		let timelines = model.get("timelines");
		timelines.forEach((tl:any) => {
			console.log("TL = ", tl);
			wsTimelines.addRegion({
				color: "#D42A23",
				start: tl["start"],
				end: tl["end"],
				drag: false,
				resize: false,
			})
		});
		wsTimelines.getRegions().forEach((tl:any) => {
			tl.element.part.add("timeline")
		});
		console.log("TIMELINES ? = ", wsTimelines.getRegions())
	}
}
