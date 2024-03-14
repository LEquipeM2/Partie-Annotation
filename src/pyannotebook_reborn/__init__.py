import importlib.metadata
import pathlib
import random
import string

import ipywidgets
import anywidget
import traitlets
import base64
import io
import scipy
import numpy as np
import base64
import os
import csv

from typing import Dict, Optional
from pyannote.core import Annotation, Segment
from pyannote.core.utils.generators import string_generator



from pyannote.audio import Audio, Pipeline

from .rttm import load_rttm

try:
    __version__ = importlib.metadata.version("pyannotebook_reborn")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"


class Pyannotebook(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "widget.js"
    _css = pathlib.Path(__file__).parent / "static" / "widget.css"
    value = traitlets.Int(0).tag(sync=True)
    audio_64 = traitlets.Unicode("").tag(sync=True)

    labels = traitlets.Dict()
    regions = traitlets.List().tag(sync=True)
    timelines = traitlets.List().tag(sync=True)

    count_change = 0
    is_setting_regions = False
    file_name = None

    def __init__(self, audio_path, pipeline: Optional["Pipeline"] = None):
        super().__init__()
        enc=base64.b64encode(open(audio_path, 'rb').read())
        with (open("temp.txt", 'wb')) as f:
            f.write(enc)
        self.audio_64=enc
        self.file_name = os.path.basename(audio_path).split(".")[0]
        self.timeline_file = None


    def _get_annotation(self):
        annotation = Annotation(self.file_name)
        for region in self.regions:
            annotation[Segment(region["start"], region["end"]), region["id"]] = region["label"]
        return annotation

    def _set_annotation(self, annotation: Annotation):

        # rename tracks if they are not unique
        self.is_setting_regions = True

        tracks = [track for _, track in annotation.itertracks()]
        if len(tracks) > len(set(tracks)):
            annotation = annotation.relabel_tracks()

        letter_dic = {}
        index_pool = string_generator()
        for label in annotation.labels():
            letter_dic[label] = next(index_pool)
        
        self.regions = [
            {
                "start": segment.start, 
                "end": segment.end, 
                "label": letter_dic[label],
                "id": track if track.startswith("wavesurfer_") else "frompython_" + "".join(random.choices(string.ascii_lowercase, k=11))
            } for segment, track, label in annotation.itertracks(yield_label=True)]
        
        self.is_setting_regions = False

    def _del_annotation(self):
        self.regions = list()
        self.labels = dict()


    annotation = property(_get_annotation, _set_annotation, _del_annotation)

    @traitlets.observe("labels")
    def labels_has_changed(self, change: Dict):
        self.slebal = {label: idx for idx, label in change["new"].items()}

    @traitlets.observe("regions")
    def regions_has_changed(self, change: Dict):
        self.count_change += 1
        self.jpp = change
        if not self.is_setting_regions:
            self.regions = [
            {
                "start": segment.start, 
                "end": segment.end, 
                "label": label,
                "id": track if track.startswith("wavesurfer_") else "frompython_" + "".join(random.choices(string.ascii_lowercase, k=11))
            } for segment, track, label in change["new"].itertracks(yield_label=True)]

    def load_timelines(self, timeline_file):
        timelines = []
        with open(timeline_file, "r") as file:
            print(file)
            for line in file:
                line = line.split(" ")
                timelines.append({
                    "id" : line[1],
                    "start" : float(line[2]),
                    "end" : float(line[3])
                })
        self.timelines = timelines
