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
		self.m_ramp = new ramp(mat4());
		self.m_ring = new ring(mat4());
		
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
Animation.prototype.drawCourt = function(c_transform, m_transform, floor, roof, siding, board1, rim, supports) {

	var model_transform = m_transform;
	var combined_transform = mat4();
	var length = 600;
	var width = 200;
	var height = 100;

	// draw the roof and floor of the stadium identically
	m_transform = mult(m_transform, translate(0, -height/4, 0));
	m_transform = mult(m_transform, scale(length/2, 1, width/2));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, floor);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, height/4, 0));
	m_transform = mult(m_transform, scale(length/2, 1, width/2));
	//this.m_cube.draw(this.graphicsState, transform, roof); // ultimately replace with custom roof shape
	// leave top off for view

	// draw the siding identically
	// siding may currently be overlapping roof and floor
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, 0, width/4));
	m_transform = mult(m_transform, scale(length/2, height/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, siding);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, 0, -width/4));
	m_transform = mult(m_transform, scale(length/2, height/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, siding);

	// draw the ends
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(-length/4, 0, 0));
	m_transform = mult(m_transform, scale(1, height/2, width/2));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, siding);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(length/4, 0, 0));
	m_transform = mult(m_transform, scale(1, height/2, width/2));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, siding);

	// draw the basketball hoops, one at each end of the court
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(length/4-6, 0, 0));
	this.drawHoop(c_transform, m_transform, length, board1, rim, supports);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(-length/4+6, 0, 0));
	m_transform = mult(m_transform, scale(-1, 1, 1));
	this.drawHoop(c_transform, m_transform, length, board1, rim, supports);
	

}
// *******************************************************
// drawHoop(): draw basketball hoop
Animation.prototype.drawHoop = function(c_transform, m_transform, length, board1, rim, supports) {

	var model_transform = m_transform;
	var combined_transform = mat4();

	var support_length = length/50;
	var board_AR = 1.714;
	var board_width = 20;
	var board_height = board_width/board_AR;

	// draw four horizontal supports for backboard
	m_transform = mult(m_transform, translate(0, -board_height/4, -board_width/4));
	m_transform = mult(m_transform, scale(support_length, 1/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, supports);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, board_height/4, -board_width/4));
	m_transform = mult(m_transform, scale(support_length, 1/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, supports);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, -board_height/4, board_width/4));
	m_transform = mult(m_transform, scale(support_length, 1/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, supports);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(0, board_height/4, board_width/4));
	m_transform = mult(m_transform, scale(support_length, 1/2, 1));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, supports);

	// draw backboard
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(-support_length/2, 0, 0));
	m_transform = mult(m_transform, scale(1, board_height/2, board_width/2));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, board1);

	// draw backiron
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(-support_length/2-1/2, -2, 0));
	m_transform = mult(m_transform, scale(2, 1/2, 2));
	combined_transform = mult(c_transform, m_transform);
	this.m_cube.draw(this.graphicsState, combined_transform, rim);

	// draw rim
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(-9.75, -2, 0))
	combined_transform = mult(c_transform, m_transform);
	this.m_ring.draw(this.graphicsState, combined_transform, rim);

}
// *******************************************************
// drawBall(): draw the basketball
Animation.prototype.drawBall = function(c_transform, m_transform, material, time) {

	var combined_transform = mat4();
	var ball_scale = 0.8;
	var jump_time = 12600;
	var jump_peak_time = 17000;
	var jump_fall_time = 19500;
	var jump_end_time = 21250;
	var jump_offset = 7;
	var ball_offset_x = 0;
	var ball_offset_y = 4.8;
	var jump_peak_height = (jump_peak_time - jump_time)/500 + jump_offset + ball_offset_y;
	var y = 0;
	var t = (time < jump_end_time+500) ? time/150 : (jump_end_time+500)/150;
	var bounce_height = 6.75;
	var bounce_interval = 6.75;
	var bounce_end_time = bounce_height*700 + jump_end_time+500;
	var bounce = (time/700 % bounce_height);

	if (time >= 0 && time < jump_time) {
		if (bounce >= bounce_height/2) bounce = bounce_height - bounce;
	}
	else if (time >= jump_time && time < jump_peak_time) {
		y = (time - jump_time)/500 + (jump_offset+ball_offset_y)*(time-jump_time)/(jump_peak_time-jump_time);
		ball_offset_x = 0.7*(time-jump_time)/(jump_peak_time-jump_time);
		bounce = 0;
	}
	else if (time >= jump_peak_time && time < jump_fall_time) {
		y = jump_peak_height;
		ball_offset_x = 0.7;
		bounce = 0;
	}
	else if (time >= jump_fall_time && time < jump_end_time) {
		y = jump_peak_height*(jump_end_time - time)/(jump_end_time-jump_fall_time);
		ball_offset_x = 0.7*(jump_end_time - time)/(jump_end_time - jump_fall_time);
		bounce = 0;
	}
	else if (time >= jump_end_time && time < bounce_end_time) {
		bounce_height = (bounce_height > 0) ? bounce_height - (time-jump_end_time)/700 : 0;
		bounce = (time/700 % bounce_height);
		if (bounce >= bounce_height/2) bounce = bounce_height - bounce;
		bounce += (bounce_interval-bounce_height)/2;
	}
	// make sure jump_time coincides with the ball at the peak of its bounce
	else {
		bounce = bounce_interval/2;
	}

	m_transform = mult(m_transform, scale(0.8, 0.8, 0.8));
	m_transform = mult(m_transform, translate(2/ball_scale+t/ball_scale+ball_offset_x/ball_scale, -2/ball_scale+y/ball_scale-bounce, 1.5/ball_scale));
	combined_transform = mult(c_transform, m_transform);
	this.m_sphere.draw(this.graphicsState, combined_transform, material);
}
// *******************************************************
// drawPlayer(): draw the basketball player
Animation.prototype.drawPlayer = function(c_transform, m_transform, shoes, skin, uniform, time) {

	var model_transform = m_transform;
	var combined_transform = mat4();
	var jump_time = 12600; // player begins jump after 12.6 seconds have elapsed
	var jump_peak_time = 17000;
	var jump_fall_time = 19500;
	var jump_end_time = 21250;
	var celebration_time = 22000;
	var celebration_angle = (time > celebration_time) ? 90 : 0;
	var celebration_position = [145, 0, 0];
	var jump_offset = 7;
	var jump_peak_height = (jump_peak_time - jump_time)/500 + jump_offset;
	var t = (time < (jump_end_time+500)) ? time/150 : (jump_end_time+500)/150;
	var y = 0;

	if (time > jump_time && time <= jump_peak_time) {
		y = (time - jump_time)/500 + jump_offset*(time - jump_time)/(jump_peak_time-jump_time);
	}
	else if (time > jump_peak_time && time <= jump_fall_time) {
		y = jump_peak_height;
	}
	else if (time > jump_fall_time && time < jump_end_time) {
		y = jump_peak_height*(jump_end_time - time)/(jump_end_time-jump_fall_time);
	}

	// draw torso
	var body_height = 2.5;
	var body_width = 2;
	var shorts_height = 2*body_height/5;
	var shorts_width  = 2*body_width/3;

	m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
	m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
	m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
	m_transform = mult(m_transform, scale(0.8, body_height, body_width));
	m_transform = mult(m_transform, translate(t/0.8, y/body_height, 0));
	combined_transform = mult(c_transform, m_transform);	
	this.m_cube.draw(this.graphicsState, combined_transform, uniform);
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
	m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
	m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
	m_transform = mult(m_transform, scale(0.8, shorts_height, shorts_width));
	m_transform = mult(m_transform, translate(t/0.8, -0.5*body_height/shorts_height-0.5+y/shorts_height, 0));
	combined_transform = mult(c_transform, m_transform);	
	this.m_cube.draw(this.graphicsState, combined_transform, uniform);

	// draw neck
	var neck_height = 0.125;
	var neck_width = 0.25*body_width;
	var neck_length = 0.5;

	m_transform = model_transform;
	m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
	m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
	m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
	m_transform = mult(m_transform, scale(neck_length, neck_height, neck_width));
	m_transform = mult(m_transform, translate(t/neck_length, 0.5*body_height/neck_height+0.5+y/neck_height, 0));
	combined_transform = mult(c_transform, m_transform);	
	this.m_cube.draw(this.graphicsState, combined_transform, skin);

	// draw head
	var head_radius = 0.8;
	m_transform = model_transform;
	m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
	m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
	m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
	m_transform = mult(m_transform, scale(head_radius, head_radius, head_radius));
	m_transform = mult(m_transform, translate(t/head_radius, 0.5*body_height/head_radius+neck_height/head_radius+1+y/head_radius, 0));
	combined_transform = mult(c_transform, m_transform);	
	this.m_sphere.draw(this.graphicsState, combined_transform, skin);

	// draw legs & shoes
	var leg_height = 1.5;
	var leg_width  = 0.25;
	var leg_length = 0.25;
	var shift = 1;

	for (var i=0; i<2; i++) {
		if (shift != 0) shift *= -1;
		m_transform = model_transform;
		m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
		m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
		m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
		var top_angle = (time/40) % 180;
		var bottom_angle = (time/40) % 180;
		
		// leg angle rotation for running
		if (shift == 1) {
			if (top_angle > 45 && top_angle <= 135) top_angle = 90 - top_angle;
			else if (top_angle > 135) top_angle =  -180 + top_angle;

			if (bottom_angle < 90) bottom_angle = -top_angle;
			else bottom_angle = top_angle;
			
			// stop rotation once player is in the air from jump
			// set angles to their current value
			if (time > jump_time && time < jump_fall_time) {
				top_angle = -45;
				bottom_angle = -45;
			}
			else if (time >= jump_fall_time && time < jump_end_time) {
				top_angle = -45 + 45*(time-jump_fall_time)/(jump_end_time-jump_fall_time);
				bottom_angle = -45 + 45*(time-jump_fall_time)/(jump_end_time-jump_fall_time);
				
			}
			else if (time >= jump_end_time) {
				top_angle = 0;
				bottom_angle = 0;
			}
		
		}
		else {
			if (top_angle <= 45) top_angle *= -1;
			else if (top_angle > 45 && top_angle <= 135) top_angle = -90 + top_angle;
			else if (top_angle > 135) top_angle =  180 - top_angle;

			if (bottom_angle < 90) bottom_angle = top_angle;
			else bottom_angle = -top_angle;
			
			// stop rotation once player is in the air from jump
			// set angles to their current value
			if (time > jump_time && time < jump_fall_time) {
				top_angle = 45;
				bottom_angle = -45;
			}
			else if (time >= jump_fall_time && time < jump_end_time) {
				top_angle = 45 - 45*(time-jump_fall_time)/(jump_end_time-jump_fall_time);
				bottom_angle = -45 + 45*(time-jump_fall_time)/(jump_end_time-jump_fall_time);
				
			}
			else if (time >= jump_end_time) {
				top_angle = 0;
				bottom_angle = 0;
			}
		
		}

		// upper leg rotation
		m_transform = mult(m_transform, translate(t, -body_height/2-shorts_height+y, 0));
		m_transform = mult(m_transform, rotate(top_angle, 0, 0, 1));
		m_transform = mult(m_transform, translate(-t, body_height/2+shorts_height-y, 0));
		
		// upper leg draw
		m_transform = mult(m_transform, scale(leg_length, leg_height, leg_width));
		m_transform = mult(m_transform, translate(t/leg_length, -0.5*body_height/leg_height-shorts_height/leg_height-1/2+y/leg_height, 1.5*shift));
		combined_transform = mult(c_transform, m_transform);
		this.m_cube.draw(this.graphicsState, combined_transform, skin);
		
		// lower leg rotation for running
		m_transform = mult(m_transform, scale(1/leg_length, 1/leg_height, 1/leg_width));
		m_transform = mult(m_transform, translate(0, -0.5*leg_height, 0));
		m_transform = mult(m_transform, rotate(bottom_angle, 0, 0, 1));
		m_transform = mult(m_transform, translate(0, 0.5*leg_height, 0));
		m_transform = mult(m_transform, scale(leg_length, leg_height, leg_width));
		//
		
		// lower leg
		m_transform = mult(m_transform, translate(0, -1, 0));
		combined_transform = mult(c_transform, m_transform);
		this.m_cube.draw(this.graphicsState, combined_transform, skin);

		// shoes
		var shoe_length = 0.25;
		var shoe_width  = 0.25;
		var shoe_height = 0.25;

		m_transform = mult(m_transform, translate(0,-0.5*shoe_height/leg_height-1/2, 0));
		m_transform = mult(m_transform, scale(1.5*shoe_length/leg_length, shoe_height/leg_height, shoe_width/leg_width));
		combined_transform = mult(c_transform, m_transform);
		this.m_cube.draw(this.graphicsState, combined_transform, shoes);
		m_transform = mult(m_transform, translate(1, 0, 0));
		combined_transform = mult(c_transform, m_transform);
		this.m_ramp.draw(this.graphicsState, combined_transform, shoes);
	}

	// draw arms
	var shift = 1;
	var arm_length = leg_length;
	var arm_width = leg_height;
	var arm_height = leg_length;
	var shoulder_angle = 70;
	var elbow_angle = 20;

	for (var i=0; i<2; i++) {
		if (shift) shift *= -1;
		m_transform = model_transform;
		m_transform = mult(m_transform, translate(celebration_position[0], celebration_position[1], celebration_position[2]));	
		m_transform = mult(m_transform, rotate(celebration_angle, 0, 1, 0));
		m_transform = mult(m_transform, translate(-celebration_position[0], -celebration_position[1], -celebration_position[2]));	
		m_transform = mult(m_transform, scale(arm_length, arm_height, arm_width));
		m_transform = mult(m_transform, translate(t/arm_length, 0.7*body_height/(2*arm_height)+y/arm_height, 0.5*shift*(body_width/arm_width+1)));

		// angle arms downward
		m_transform = mult(m_transform, scale(1/arm_length, 1/arm_height, 1/arm_width));
		m_transform = mult(m_transform, translate(0, 0, -shift*arm_width/2));
		m_transform = mult(m_transform, rotate(shift*shoulder_angle, 1, 0, 0));
		m_transform = mult(m_transform, translate(0, 0, shift*arm_width/2));
		m_transform = mult(m_transform, scale(arm_length, arm_height, arm_width));

		// shoulder rotation for non-dribbling hand
		var shoulder_angle_x = time/40 % 180;
		if (shift == 1) {
			shoulder_angle_x = 45;

			// raise arm for dunk
			if (time >= jump_time && time < jump_peak_time) {
				shoulder_angle_x = 45 + 90*(time-jump_time)/(jump_peak_time-jump_time);
			}
			else if (time >= jump_peak_time && time < jump_fall_time) {
				shoulder_angle_x = 135;
			}
			else if (time >= jump_fall_time && time < jump_end_time) {
				shoulder_angle_x = 135*(jump_end_time-time)/(jump_end_time-jump_fall_time);
			}
			else if (time >= jump_end_time) {
				shoulder_angle_x = 0;
			}
		}
		else {
			if (shoulder_angle_x > 45 && shoulder_angle_x <= 135) shoulder_angle_x = 90 - shoulder_angle_x;
			else if (shoulder_angle_x > 135) shoulder_angle_x = -180 + shoulder_angle_x;

			// stop rotation for jump
			// set shoulder_angle_x to its current position
			if (time >= jump_time && time < jump_fall_time) {
				shoulder_angle_x = -45;	
			}
			else if (time >= jump_fall_time && time < jump_end_time) {
				shoulder_angle_x = -45*(jump_end_time-time)/(jump_end_time-jump_fall_time);	
			}
			else if (time >= jump_end_time) {
				shoulder_angle_x = 0;
			}
		}


		m_transform = mult(m_transform, scale(1/arm_length, 1/arm_height, 1/arm_width));
		m_transform = mult(m_transform, translate(0, 0, -shift*arm_width/2));
		m_transform = mult(m_transform, rotate(-shift*shoulder_angle, 1, 0, 0));
		m_transform = mult(m_transform, rotate(shoulder_angle_x, 0, 0, 1));
		m_transform = mult(m_transform, rotate(shift*shoulder_angle, 1, 0, 0));
		m_transform = mult(m_transform, translate(0, 0, shift*arm_width/2));
		m_transform = mult(m_transform, scale(arm_length, arm_height, arm_width));

		// draw upper arm
		combined_transform = mult(c_transform, m_transform);
		this.m_cube.draw(this.graphicsState, combined_transform, skin);

		// elbow rotation
		m_transform = mult(m_transform, translate(0, 0, shift/2));
		m_transform = mult(m_transform, scale(1/arm_length, 1/arm_height, 1/arm_width));
		m_transform = mult(m_transform, rotate(shift*elbow_angle, 1, 0, 0));
		m_transform = mult(m_transform, scale(arm_length, arm_height, arm_width));
		m_transform = mult(m_transform, translate(0, 0, shift/2));

		// draw lower arm
		combined_transform = mult(c_transform, m_transform);
		this.m_cube.draw(this.graphicsState, combined_transform, skin);
	}
	
	
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
		var camera_transform = mat4();
		var combined_transform = mat4();
		
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

		var floor      = new Material( vec4(.5, .5, .5, 1), 1, 1, 1, 40, "court.jpg");
		var basketball = new Material( vec4(.5, .5, .5, 1), 1, 1, 1, 40, "basketball.png");
		var backboard  = new Material( vec4(.5, .5, .5, 1), 1, 1, 1, 40, "backboard.jpg"); // texture placement is off center -- fix later
		var rim        = new Material( vec4(218/255, 98/255, 0, 1), 1, 1, 1, 40); 
		var UCLA       = new Material( vec4(.5, .5, .5, 1), 1, 1, 1, 40, "UCLA_Bruins.jpg");
		var skin       = new Material( vec4(180/255, 128/255, 89/255, 1), 1, 1, 1, 40);
		var white      = new Material( vec4(255, 255, 255, 1), 1, 1, 1, 40);
		var bruin_blue = new Material( vec4(58/255, 131/255, 196/255), 1, 1, 1, 40);
			
		/**********************************
		Start coding here!!!!
		**********************************/

		//model_transform = mult(model_transform, rotate(90, 0, 1, 0));
		var time = this.graphicsState.animation_time; 
		var arena_pan = 8000;
		var follow_player = 8500;
		var player_closeup = 0.6*(follow_player + 21250);
		var player_time = (time < arena_pan) ? 0 : time - arena_pan;

		var eye = vec3();
		var at  = vec3();
		var up  = vec3();

		if (time < arena_pan) {
			eye = vec3(-100*Math.sin(Math.PI*time/4000), 100, 100*Math.cos(Math.PI*time/4000));
			at  = vec3(0, 0, 0);
			up  = vec3(Math.sin(Math.PI*time/4000), 0, -Math.cos(Math.PI*time/4000));
		}
		/*else if (time >= 2000 && time < 4000) {
			eye = vec3(-50, 50, 0);
			at  = vec3(25*(time-2000)/1000, 15*(time-2000)/1000, 0);
			up  = vec3(1, 0, 0);
		}
		else if (time >= 4000 && time < 5000) {
			eye = vec3(-50, 50, 0);
			at  = vec3(50, 30, 0);
			up  = vec3(1, 0, 0);
		}
		else if (time >= 5000 && time < 7000) {
			eye = vec3(-50+50*(time-5000)/1000, 50, 0);
			at  = vec3(50+12.5*(time-5000)/1000, 30, 0);
			up  = vec3(1, 0, 0);
		}
		else {
			eye = vec3(50, 50, 0);
			at  = vec3(75, 30, 0);
			up  = vec3(1, 0, 0);
		}*/
		else if (time >= arena_pan && time < follow_player) {
			eye = vec3(0, 100, 100);
			at  = vec3(0, 0, 0);
			up  = vec3(0, 0, -1);
		}
		else if (time >= follow_player && time < player_closeup) {
			eye = vec3(120*(time-follow_player)/(player_closeup-follow_player), 10+90*(player_closeup-time)/(player_closeup-follow_player), 15+85*(player_closeup-time)/(player_closeup-follow_player));
			at  = vec3(115*(time-follow_player)/(player_closeup-follow_player), 0, 0);
			up  = vec3(0, 0, -1);
		}
		else {
			eye = vec3(120, 10, 15);
			at  = vec3(115, 0, 0);
			up  = vec3(0, 0, -1);
		}

		camera_transform = lookAt(eye, at, up);
		//camera_transform = mat4(vec4(1, 0, 0, 0), vec4(0, 1, 0, 0), vec4(0, 0, 1, 0), vec4(0, 0, 0, 1));

		this.drawCourt(camera_transform, model_transform, floor, blue, UCLA, backboard, rim, grayish);
		model_transform = mult(model_transform, translate(0, -19, 0));
		this.drawPlayer(camera_transform, model_transform, blue, skin, bruin_blue, player_time);
		this.drawBall(camera_transform, model_transform, basketball, player_time);

	}	



Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	debug_screen_object.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
	debug_screen_object.string_map["fps"] = "FPS: " + 1000/(this.animation_delta_time+0.001); // display frames per second
}
