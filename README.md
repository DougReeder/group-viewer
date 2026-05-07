# A-Frame Presenter

A component for the A-Frame WebXR framework which allows multiple users, in and out of VR, to immerse themselves in common 3-D content.
Users in VR can use pointers to call out parts of the content.
Tools using aframe-presenter run in any modern browser; send people the URL and they can connect without installing anything or setting up an account.

You communicate with other users using the audio from your existing meeting software, and you pass the URL to others with the text chat of your existing meeting.

Uses the [aframe-croquet-component](https://github.com/NikolaySuslov/aframe-croquet-component) and the Multisynq network to syncronize content and user avatars.

Includes two example tools:

## Model Presenter

[Model Presenter](https://modelpresenter.hominidsoftware.com/) allows multiple users to load a 3-D model in the common GLB format,
re-scale it, point out features with laser pointers,
and toggle animation.

## Data Presenter

Data Presenter allows multiple users to immerse themselves in a 3-D dataset,
re-scale it, and point out features with laser pointers.
It can straighforwardly be extended to load multi-dimensional data from ArcGIS, NetCDF, HDF or GRIB files.
