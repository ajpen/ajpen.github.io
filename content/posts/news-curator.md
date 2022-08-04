---
author: "Anfernee Jervis"
title: "Article Curator for Kindle"
date: "2021-03-09"
tags: [
	"automation",
	"coding",
	"raspberrypi",
	"calibre"
]
---

Another short one.  
  
I noticed I mostly use my mobile data to read articles suggested by Google Chrome. Besides that, I usually sip my data for maps and whatever bits of IM I do. 
I also have a kindle sitting around not doing much. So I decided to save a bit of data by pulling the articles beforehand and sending them to the kindle. 
  
I wanted it to be automated everyday, so I set up a little Raspberry Pi server locally. 
On it, I decided to install calibre and then set up a script that pulls articles from all the calibre recipes 
in a particle directory, and send them to my kindle email address. 
You can find the script [here](https://gist.github.com/ajpen/d2c4862f0a34145179dffe889731e841). 
The script paired with cron will have your articles on your kindle everyday. 
Don't have your kindle? If you're signed in on whatever email account used to send the articles, you can find it there as well (in your sent folder likely).   
  
If you find any bugs or issues, drop a comment on the gist and I'll take a look.  
  
That is all. 
