// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), 1, 1, 1, 40, "" ) ); }


// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 0, 1 );			// Background color

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		
		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translate(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotate( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotate( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0005 * animation_delta_time;
		var meters_per_frame  = .03 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotate( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translate( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// *******************************************************
// drawCourt(): draw the basketball court
Animation.prototype.drawCourt = function(transform, floor, roof, siding) {

	var orig_transform = transform;
	var length = 600;
	var width = 200;
	var height = 100;

	// draw the roof and floor of the stadium identically
	transform = mult(transform, translate(0, -height/4, 0));
	transform = mult(transform, scale(length/2, 1, width/2));
	this.m_cube.draw(this.graphicsState, transform, floor);
	transform = orig_transform;
	transform = mult(transform, translate(0, height/4, 0));
	transform = mult(transform, scale(length/2, 1, width/2));
	//this.m_cube.draw(this.graphicsState, transform, roof); // ultimately replace with custom roof shape
	// leave top off for view

	// draw the siding identically
	// siding may currently be overlapping roof and floor
	transform = orig_transform;
	transform = mult(transform, translate(0, 0, width/4));
	transform = mult(transform, scale(length/2, height/2, 1));
	this.m_cube.draw(this.graphicsState, transform, siding);
	transform = orig_transform;
	transform = mult(transform, translate(0, 0, -width/4));
	transform = mult(transform, scale(length/2, height/2, 1));
	this.m_cube.draw(this.graphicsState, transform, siding);

	// draw the ends
	transform = orig_transform;
	transform = mult(transform, translate(-length/4, 0, 0));
	transform = mult(transform, scale(1, height/2, width/2));
	this.m_cube.draw(this.graphicsState, transform, siding);
	transform = orig_transform;
	transform = mult(transform, translate(length/4, 0, 0));
	transform = mult(transform, scale(1, height/2, width/2));
	this.m_cube.draw(this.graphicsState, transform, siding);

	// draw the basketball hoops, one at each end of the court
	

}
// *******************************************************
// drawHoop(): draw basketball hoop
Animation.prototype.drawHoop = function(transform, length, board1, board2, rim, supports) {
	
	var orig_transform = transform;

	var support_length = length/100;
	var board_AR = 1.714;
	var board_width = 20;
	var board_height = board_width/board_AR;
	//var support_width = 1;
	//var support_height = 1;

	// draw four horizontal supports for backboard
	transform = mult(transform, translate(0, -board_height/4, -board_width/4));
	transform = mult(transform, scale(support_length, 1, 1));
	this.m_cube.draw(this.graphicsState, transform, supports);
	transform = orig_transform;
	transform = mult(transform, translate(0, board_height/4, -board_width/4));
	transform = mult(transform, scale(support_length, 1, 1));
	this.m_cube.draw(this.graphicsState, transform, supports);
	transform = orig_transform;	
	transform = mult(transform, translate(0, -board_height/4, board_width/4));
	transform = mult(transform, scale(support_length, 1, 1));
	this.m_cube.draw(this.graphicsState, transform, supports);
	transform = orig_transform;
	transform = mult(transform, translate(0, board_height/4, board_width/4));
	transform = mult(transform, scale(support_length, 1, 1));
	this.m_cube.draw(this.graphicsState, transform, supports);

	// draw backboard
	transform = orig_transform;
	transform = mult(transform, rotate(90, 0, 1, 0));
	transform = mult(transform, scale(board_width/2, board_height/2, 1));
	this.m_cube.draw(this.graphicsState, transform, board1);

	// draw backiron
	transform = orig_transform;
	transform = mult(transform, scale(2, 1/2, 2));
	this.m_cube.draw(this.graphicsState, transform, rim);

	// draw rim
	// going to need a new shape for this
	//this.m_ring.draw(this.graphicsState, transform, rim);

}
// *******************************************************

// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		var purplePlastic = new Material( vec4( .9,.5,.9,1 ), 1, 1, 1, 40 ), // Omit the string parameter if you want no texture
			greyPlastic = new Material( vec4( .5,.5,.5,1 ), 1, 1, .5, 20 ),
			earth = new Material( vec4( .5,.5,.5,1 ), 1, 1, 1, 40, "earth.gif" ),
			stars = new Material( vec4( .5,.5,.5,1 ), 1, 1, 1, 40, "stars.png" );
		
		var grass    = new Material( vec4(0.28, 0.52, 0, 1), 1, 1, 1, 40);
		var blue     = new Material( vec4(0, 0, 1, 1), 1, 1, 1, 40);
		var red      = new Material( vec4(1, 0, 0, 1), 1, 1, 1, 40);
		var brown    = new Material( vec4(0.290, 0.157, 0, 1), 1, 1, 1, 40);
		var gold     = new Material( vec4(1, 1, 0, 1), 1, 1, 1, 40);
		var grayish  = new Material( vec4(0.4, 0.4, 0.6, 1), 1, 1, 1, 40);
			
		/**********************************
		Start coding here!!!!
		**********************************/
		
		model_transform = mult(model_transform, rotate(90, 0, 1, 0));
		this.drawCourt(model_transform, grass, blue, blue);
		this.drawHoop(model_transform, 200, grass, blue, gold, grayish);


		/*model_transform = mult( model_transform, translate( 0, 10, -15) );		// Position the next shape by post-multiplying another matrix onto the current matrix product
		this.m_cube.draw( this.graphicsState, model_transform, purplePlastic );			// Draw a cube, passing in the current matrices
		CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);							// How to draw a set of axes, conditionally displayed - cycle through by pressing p and m
		
		model_transform = mult( model_transform, translate( 0, -2, 0 ) );		
		this.m_fan.draw( this.graphicsState, model_transform, greyPlastic );			// Cone
		CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);
		
		model_transform = mult( model_transform, translate( 0, -4, 0 ) );
		this.m_cylinder.draw( this.graphicsState, model_transform, greyPlastic );		// Tube
		CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);
		
		
		model_transform = mult( model_transform, translate( 0, -3, 0 ) );											// Example Translate
		model_transform = mult( model_transform, rotate( this.graphicsState.animation_time/20, 0, 1, 0 ) );			// Example Rotate
		model_transform = mult( model_transform, scale( 5, 1, 5 ) );												// Example Scale
		this.m_sphere.draw( this.graphicsState, model_transform, earth );				// Sphere
		
		model_transform = mult( model_transform, translate( 0, -2, 0 ) );
		this.m_strip.draw( this.graphicsState, model_transform, stars );				// Rectangle
		CURRENT_BASIS_IS_WORTH_SHOWING(this, model_transform);*/
	}	



Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	debug_screen_object.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
}