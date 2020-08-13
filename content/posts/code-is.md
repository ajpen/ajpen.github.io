---
author: "Anfernee Jervis"
title: "Code is Tedious"
date: "2020-08-13"
tags: [
	"thoughts",
	"coding",
]
---

It's 4AM and I haven't slept *sigh*.  
  
Anyway...  
  
Code is tedious. You can write your algorithm as clear as possible, with very reasonable proof of correctness, only to have your resulting program fail when a function serves a 2-D array of length 1, to a function whose mouth can only fit 1-D arrays. The code got in the way; its the developer's version of the agony faced by a writer struggling to paint his imagination on paper. I often heard of the act of programming described as a art; as the blacksmith constantly strikes the hot metal into a complete sword, so does the developer cut, shift and refine code to her liking...  
  
It's easy to see a complete sword. Programs however...  
  
How do we ensure the code we write behaves as we wish? We, uh, write...more...code....because we can guarantee our tests will work without bugs right? right?  
  
Not when you wrote it.  
  
Tests should be very strict. For example, procedure `f()` has a domain x, and a range y. The mapping of x->y should be verified. This isn't straightforward however, and may even be incredibly difficult. Also, one cannot forget that **code is tedious**. It would be great if there was something that did it for us though, right? Maybe such a thing exist and I'm ignorant of it...

While using a library, the documentation promised the function `g()` yields all edges near a set of coordinates within a given distance of the coordinates...  
Well, thats what I thought it said...  
At least I was close right? Well, the code I wrote wasn't too fond of this misunderstanding.
  
I'd argue that documentation is more important than the code itself. Many of us come from diverse backgrounds, cultures and languages. Its extremely difficult to concisely and clearly explain complicated ideas for all to digest. It is especially difficult to do so with English, and this is coming from a native speaker; well, somewhat native.  
  
Nothing is more annoying than being delayed from testing a hypothesis due to a mistype or a misunderstanding of documentation. The hours lost writing code to test a hypothesis could've been spent analyzing the results.  
  
Maybe that'll change in the future.  
We'll see.
