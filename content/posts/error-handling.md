---
author: "Anfernee Jervis"
title: "Error Handling"
date: "2020-12-01"
tags: [
    "Programming",
    "Exceptions",
	"Error Handling"
]
---

[I saw a post on error handling earlier this morning.](https://www.fpcomplete.com/blog/error-handling-is-hard/) I skimmed the article, so bear that in mind. This isn't however directed at the article though. I just wanted to share my thoughts on error handling.  
  
I agree that error handling is hard. I also think that error handling isn't a feature of any particular language 
implementation, but rather an element of the application design itself.
 
Applications that have even the slightest bit of complexity usually have various levels of failures. 
When designing applications, one should think carefully about where things can go wrong and the potential course
of action for each situation. 

Sometimes a crashing application is bad, and sometimes its reasonable. Sometimes you'd want a clean error message 
while other times you wish you dumped the stack trace.  

What I personally think matters less is how its explicitly done through code. Whether you throw exceptions on errors
or prefer to have functions return error values, should be thought about briefly, agreed upon, 
documented in a style guide and then no longer discussed unless absolutely necessary. The effort of error handling 
should be more in the design of the application and less in the code itself.  
  
That is all.
