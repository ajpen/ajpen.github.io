---
author: "Anfernee Jervis"
title: "Nixos: Overriding System Packages"
date: "2020-07-19"
tags: [
    "sync",
    "Linux",
]
---

*This one's short.*  
  
Is there a system package in Nixos whose source you wish to replace with your own? Maybe you have your own fork of dwm, like I did. Hopefully you come across this on your first search. I'll save you some hours.  
  
First override the package config in nixpkgs to change the src:
  
```
nixpkgs.config.packageOverrides = pkgs: {
  dwm = pkgs.dwm.overrideAttrs (_: {
    src = {
      url = "path/to/your/src";
    }
  });
}
```  
  
if its on Github use `builtins.fetchGit` on `src`:

```
  src = builtins.fetchGit {
	url = "https://github.com/ajpen/dwm";
	ref = "master";
  };

```  
  
Make sure to add the package (in this case dwm) to your list of system packages:
```
  environment.systemPackages = with pkgs; [
    ... dwm ...
  ]
```  
  
Nixos will install the package (dwm in this case) as a system package using the src specified. Now you can use your package (dwm in this example) as typical. If its a dependency to something else, this step could probably be skipped unless you have to explicitly indicate that dependency. In my case, I needed to tell xserver to start the dwm on login:  
  
```  
  services.xserver.desktopManager.session =
	[{ 
	  name = "dwm";
	  start = ''
	    /run/current-system/sw/bin/dwm &
	    waitPID=$!
	  '';
	}
  ];

```  
  
That is all.
