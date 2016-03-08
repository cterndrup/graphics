//
// template-rt.cpp
//

#define _CRT_SECURE_NO_WARNINGS
#include "matm.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int g_width;
int g_height;

struct Ray
{
    vec4 origin;
    vec4 dir;
};

// TODO: add structs for spheres, lights and anything else you may need.
struct Sphere
{
    string name;
    float x, y, z;
    float scl_x, scl_y, scl_z;
    float color_r, color_g, color_b;
    float Ka, Kd, Ks, Kr;
    float n; // specular exponent
};

struct Light
{
    string name;
    float x, y, z;
    float Ir, Ig, Ib; // light intensity
};

struct BColor // background color
{
    float r, g, b;
} background_color;

struct AmbientIntensity // scene's ambient intensity
{
    float Ir, Ig, Ib;
} ambient_intensity;

vector<vec4> g_colors;

float g_left;
float g_right;
float g_top;
float g_bottom;
float g_near;

vector<struct Sphere> spheres;
vector<struct Light> light_sources;

string outfile; // output file name


// -------------------------------------------------------------------
// Input file parsing

vec4 toVec4(const string& s1, const string& s2, const string& s3)
{
    stringstream ss(s1 + " " + s2 + " " + s3);
    vec4 result;
    ss >> result.x >> result.y >> result.z;
    result.w = 1.0f;
    return result;
}

float toFloat(const string& s)
{
    stringstream ss(s);
    float f;
    ss >> f;
    return f;
}

void parseLine(const vector<string>& vs)
{
    //TODO: add parsing of NEAR, LEFT, RIGHT, BOTTOM, TOP, SPHERE, LIGHT, BACK, AMBIENT, OUTPUT.
    const int num_labels = 11;
    const string labels[] = { "NEAR", "LEFT", "RIGHT", "BOTTOM", "TOP", "RES", "SPHERE", "LIGHT", "BACK", "AMBIENT", "OUTPUT" };
    unsigned label_id = find(labels, labels+num_labels, vs[0]) - labels;
    
    switch (label_id)
    {
        case 0: g_near = toFloat(vs[1]) break;    // NEAR
        case 1: g_left = toFloat(vs[1]) break;    // LEFT
        case 2: g_right = toFLoat(vs[1]) break;   // RIGHT
        case 3: g_bottom = toFloat(vs[1]) break;  // BOTTOM
        case 4: g_top = toFloat(vs[1]) break;     // TOP
        case 5:                                   // RES
            g_width  = (int)toFloat(vs[1]);
            g_height = (int)toFloat(vs[1]);
            g_colors.resize(g_width * g_height);
            break;
        case 6:                                   // SPHERE
            struct Sphere s;
            s.name = vs[1];
            s.x = toFloat(vs[2]); s.y = toFloat(vs[3]); s.z = toFloat(vs[4]);
            s.scl_x = toFloat(vs[5]); s.scl_y = toFloat(vs[6]); s.scl_z = toFloat(vs[7]);
            s.color_r = toFloat(vs[8]); s.color_b = toFLoat(vs[9]); s.color_g = toFloat(vs[10]);
            s.Ka = toFloat(vs[11]); s.Kd = toFloat(vs[12]); s.Kr = toFloat(vs[13]); s.Ks = toFloat(vs[14]);
            s.n = toFloat(vs[15]);
            spheres.push_back(s);
            break;
        case 7:                                   // LIGHT
            struct Light l;
            l.name = vs[1];
            l.x = toFloat(vs[2]); l.y = toFloat(vs[3]); l.z = toFloat(vs[4]);
            l.Ir = toFloat(vs[5]); l.Ig = toFloat(vs[6]); l.Ib = toFloat(vs[7]);
            light_sources.push_back(l);
            break;
        case 8:                                   // BACK
            background_color.r = toFloat(vs[1]);
            background_color.g = toFloat(vs[2]);
            background_color.b = toFloat(vs[3]);
            break;
        case 9:                                   // AMBIENT
            ambient_intensity.Ir = toFloat(vs[1]);
            ambient_intensity.Ig = toFloat(vs[2]);
            ambient_intensity.Ib = toFloat(vs[3]);
            break;
        case 10:                                  // OUTPUT
            outfile = vs[1];
            break;
        default:
            cout << "Invalid input file format" << endl;
            exit(1);
            break;
    }
    
    
}

void loadFile(const char* filename)
{
    ifstream is(filename);
    if (is.fail())
    {
        cout << "Could not open file " << filename << endl;
        exit(1);
    }
    string s;
    vector<string> vs;
    while(!is.eof())
    {
        vs.clear();
        getline(is, s);
        istringstream iss(s);
        while (!iss.eof())
        {
            string sub;
            iss >> sub;
            vs.push_back(sub);
        }
        parseLine(vs);
    }
}


// -------------------------------------------------------------------
// Utilities

void setColor(int ix, int iy, const vec4& color)
{
    int iy2 = g_height - iy - 1; // Invert iy coordinate.
    g_colors[iy2 * g_width + ix] = color;
}


// -------------------------------------------------------------------
// Intersection routine

// TODO: add your ray-sphere intersection routine here.


// -------------------------------------------------------------------
// Ray tracing

vec4 trace(const Ray& ray)
{
    // TODO: implement your ray tracing routine here.
    return vec4(0.0f, 0.0f, 0.0f, 1.0f);
}

vec4 getDir(int ix, int iy)
{
    // TODO: modify this. This should return the direction from the origin
    // to pixel (ix, iy), normalized.
    vec4 dir;
    dir = vec4(0.0f, 0.0f, -1.0f, 0.0f);
    return dir;
}

void renderPixel(int ix, int iy)
{
    Ray ray;
    ray.origin = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    ray.dir = getDir(ix, iy);
    vec4 color = trace(ray);
    setColor(ix, iy, color);
}

void render()
{
    for (int iy = 0; iy < g_height; iy++)
        for (int ix = 0; ix < g_width; ix++)
            renderPixel(ix, iy);
}


// -------------------------------------------------------------------
// PPM saving

void savePPM(int Width, int Height, char* fname, unsigned char* pixels) 
{
    FILE *fp;
    const int maxVal=255;

    printf("Saving image %s: %d x %d\n", fname, Width, Height);
    fp = fopen(fname,"wb");
    if (!fp) {
        printf("Unable to open file '%s'\n", fname);
        return;
    }
    fprintf(fp, "P6\n");
    fprintf(fp, "%d %d\n", Width, Height);
    fprintf(fp, "%d\n", maxVal);

    for(int j = 0; j < Height; j++) {
        fwrite(&pixels[j*Width*3], 3, Width, fp);
    }

    fclose(fp);
}

void saveFile()
{
    // Convert color components from floats to unsigned chars.
    // TODO: clamp values if out of range.
    unsigned char* buf = new unsigned char[g_width * g_height * 3];
    for (int y = 0; y < g_height; y++)
        for (int x = 0; x < g_width; x++)
            for (int i = 0; i < 3; i++)
                buf[y*g_width*3+x*3+i] = (unsigned char)(((float*)g_colors[y*g_width+x])[i] * 255.9f);
    
    // TODO: change file name based on input file name. DONE
    savePPM(g_width, g_height, outfile, buf);
    delete[] buf;
}


// -------------------------------------------------------------------
// Main

int main(int argc, char* argv[])
{
    if (argc < 2)
    {
        cout << "Usage: template-rt <input_file.txt>" << endl;
        exit(1);
    }
    loadFile(argv[1]);
    render();
    saveFile();
	return 0;
}
