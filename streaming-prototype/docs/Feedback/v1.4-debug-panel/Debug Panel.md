# Functionality

1. On VIZIO, pressing back button does not close the debug panel. However, pressing the `exit` key does. Here are VIZIOs documented button mappings. I expect that the back button closes the panel. *This may mean we need a way to determine the device is being run on in order to provide the proper button mapping*
	1. #### Short Commands

| KEY                | KEYCODE | CODE               | SHIFT KEY |
| ------------------ | ------- | ------------------ | --------- |
| Backspace          | 8       | Backspace          | False     |
| Enter              | 13      | Enter              | False     |
| MediaPause         | 19      | MediaPause         | False     |
| Exit               | 27      | Exit               | False     |
|                    | 32      | Space              | False     |
| PageUp             | 33      | PageUp             | False     |
| PageDown           | 34      | PageDown           | False     |
| ArrowLeft          | 37      | ArrowLeft          | False     |
| ArrowUp            | 38      | ArrowUp            | False     |
| ArrowRight         | 39      | ArrowRight         | False     |
| ArrowDown          | 40      | ArrowDown          | False     |
| MediaRewind        | 412     | MediaRewind        | False     |
| MediaStop          | 413     | MediaStop          | False     |
| MediaPlay          | 415     | MediaPlay          | False     |
| MediaFastForward   | 417     | MediaFastForward   | False     |
| MediaTrackNext     | 418     | MediaTrackNext     | False     |
| MediaTrackPrevious | 419     | MediaTrackPrevious | False     |
| PrevCh             | 500     | PrevCh             | False     |