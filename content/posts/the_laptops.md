---
author: "Anfernee Jervis"
title: "The \"Two Laptops\" Problem"
date: "2020-07-19"
tags: [
    "sync",
    "Linux",
]
---

About three years ago, I bought a decked out XPS 13 to replace a five year old Thinkpad E535 I had. It worked out well for me while I was working. It was light enough to take to libraries and coffee shops, and powerful enough to train small models on the go. Now that I'm in college trying to carve a path to academia, I'm taking more than my laptop and charger when I'm on the go: I got books, e-ink tablets (two of them although I might ditch the boox note), a folder for assignments and handouts, lunch, water, etc. My bag got heavier and, because of my long commute, my shoulders and back were aching more than they usually do from sitting too long. To make matters worse, my XPS battery tanked and wouldn't last longer than 45 minutes, so I was forced to take my charger everywhere.  
  
*I figured it was time for a new laptop*.  
   
I got an LG gram for the lightness and long battery life. I wanted to ditch my power adapter to keep the weight in my backpack down, and the LG Gram did a pretty good job with that. Having two laptops though brought another problem. Sync.  
  
So, here's the thing. Currently, I use one computer and the other one just sits there. The XPS is a lot more powerful so I wish to use it; the LG Gram is necessary for when the semester starts and I'll have to leave the house. So, I need to think of some way to sync the files and applications on both computers. I'm hoping to at least stop working on the XPS and be able to pick up the Gram with the files completely synced from the XPS. My hopes is to stop on the XPS and seamlessly continue where I left off on the Gram.  
  
#### A Potential Solution

Currently, I'm looking at NixOS for the operating system of both machines. Being able to install applications by editing a configuration file and running a command after makes it easy to ensure that both machines are mirrored application wise. Syncing files is easy also; installing Syncthing and configuring it to avoid NixOS related 'read-only' folders should suffice. In theory, this should now allow me to pick up the Gram knowing its files and apps are synced with the XPS. For now, I'll try to make this work. After that, I'll try making it possible to pick up on the Gram where I left off on the XPS. We'll see how it goes.  
  
That is all.
