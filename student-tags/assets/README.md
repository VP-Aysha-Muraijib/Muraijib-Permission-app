# assets /

Optional images. Nothing here is required - the program works without them.

    assets/character.png   the cartoon character shown on every card
    assets/logo.png        the school logo (page header)

**To change the character**: replace `character.png` and run the program again.
Nothing else needs to be edited.

* PNG with a transparent background works best.
* The aspect ratio is always preserved - the picture is never stretched.
* A tall (standing) character is placed beside the name automatically;
  a wide picture is placed underneath the name. You can force either one
  with `CHARACTER_LAYOUT` in `config.py`.
