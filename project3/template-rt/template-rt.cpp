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
#include <cmath>
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
    vec3 pos; //float x, y, z;
    vec3 scl; //float scl_x, scl_y, scl_z;
    vec3 color; //float color_r, color_g, color_b;
    float Ka, Kd, Ks, Kr;
    float n; // specular exponent
};

struct Light
{
    string name;
    vec3 pos; //float x, y, z;
    vec3 intensity; //float Ir, Ig, Ib; // light intensity
};

struct BColor // background color
{
    vec3 color; //float r, g, b;
} background_color;

struct AmbientIntensity // scene's ambient intensity
{
    vec3 intensity; //float Ir, Ig, Ib;
} ambient_intensity;

vector<vec4> g_colors;

float g_left;
float g_right;
float g_top;
float g_bottom;
float g_near;

vector<struct Sphere> spheres;
vector<struct Light> light_sources;

const char *outfile; // output file name

vector<unsigned int> intersected_spheres;

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
    //TODO: add parsing of NEAR, LEFT, RIGHT, BOTTOM, TOP, SPHERE, LIGHT, BACK, AMBIENT, OUTPUT. DONE
    const int num_labels = 11;
    const string labels[] = { "NEAR", "LEFT", "RIGHT", "BOTTOM", "TOP", "RES", "SPHERE", "LIGHT", "BACK", "AMBIENT", "OUTPUT" };
    unsigned label_id = find(labels, labels+num_labels, vs[0]) - labels;
    
    struct Sphere s;
    struct Light l;
    
    switch (label_id)
    {
        case 0: g_near = toFloat(vs[1]); break;    // NEAR
        case 1: g_left = toFloat(vs[1]); break;    // LEFT
        case 2: g_right = toFloat(vs[1]); break;   // RIGHT
        case 3: g_bottom = toFloat(vs[1]); break;  // BOTTOM
        case 4: g_top = toFloat(vs[1]); break;     // TOP
        case 5:                                    // RES
            g_width  = (int)toFloat(vs[1]);
            g_height = (int)toFloat(vs[2]);
            g_colors.resize(g_width * g_height);
            break;
        case 6:                                    // SPHERE
            s.name = vs[1];
            //s.x = toFloat(vs[2]); s.y = toFloat(vs[3]); s.z = toFloat(vs[4]);
            s.pos = vec3(toFloat(vs[2]), toFloat(vs[3]), toFloat(vs[4]));
            //s.scl_x = toFloat(vs[5]); s.scl_y = toFloat(vs[6]); s.scl_z = toFloat(vs[7]);
            s.scl = vec3(toFloat(vs[5]), toFloat(vs[6]), toFloat(vs[7]));
            //s.color_r = toFloat(vs[8]); s.color_g = toFloat(vs[9]); s.color_b = toFloat(vs[10]);
            s.color = vec3(toFloat(vs[8]), toFloat(vs[9]), toFloat(vs[10]));
            s.Ka = toFloat(vs[11]); s.Kd = toFloat(vs[12]); s.Kr = toFloat(vs[13]); s.Ks = toFloat(vs[14]);
            s.n = toFloat(vs[15]);
            spheres.push_back(s);
            intersected_spheres.push_back(0);
            /*printf("x: %f, y: %f, z: %f\n", s.x, s.y, s.z);
            printf("scl_x: %f, scl_y: %f, scl_z: %f\n", s.scl_x, s.scl_y, s.scl_z);
            printf("color_r: %f, color_g: %f, color_b: %f\n", s.color_r, s.color_g, s.color_b);
            printf("Ka: %f, Kd: %f, Kr: %f, Ks: %f\n", s.Ka, s.Kd, s.Kr, s.Ks);
            printf("exponent: %f\n", s.n);
            printf("\n");*/
            
            break;
        case 7:                                    // LIGHT
            l.name = vs[1];
            //l.x = toFloat(vs[2]); l.y = toFloat(vs[3]); l.z = toFloat(vs[4]);
            l.pos = vec3(toFloat(vs[2]), toFloat(vs[3]), toFloat(vs[4]));
            //l.Ir = toFloat(vs[5]); l.Ig = toFloat(vs[6]); l.Ib = toFloat(vs[7]);
            l.intensity = vec3(toFloat(vs[5]), toFloat(vs[6]), toFloat(vs[7]));
            light_sources.push_back(l);
            
            /*printf("x: %f, y: %f, z: %f\n", l.x, l.y, l.z);
            printf("Ir: %f, Ig: %f, Ib: %f\n", l.Ir, l.Ig, l.Ib);
            printf("\n");*/

            break;
        case 8:                                    // BACK
            //background_color.r = toFloat(vs[1]);
            //background_color.g = toFloat(vs[2]);
            //background_color.b = toFloat(vs[3]);
            background_color.color = vec3(toFloat(vs[1]), toFloat(vs[2]), toFloat(vs[3]));
            /*printf("r: %f, g: %f, b: %f\n", background_color.r, background_color.g, background_color.b);
            printf("\n");*/

            break;
        case 9:                                    // AMBIENT
            //ambient_intensity.Ir = toFloat(vs[1]);
            //ambient_intensity.Ig = toFloat(vs[2]);
            //ambient_intensity.Ib = toFloat(vs[3]);
            ambient_intensity.intensity = vec3(toFloat(vs[1]), toFloat(vs[2]), toFloat(vs[3]));
            /*printf("Ir: %f, Ig: %f, Ib: %f\n", ambient_intensity.Ir, ambient_intensity.Ig, ambient_intensity.Ib);
            printf("\n");*/
            
            break;
        case 10:                                   // OUTPUT
            outfile = (vs[1]).c_str();
            break;
        default:
            //cout << "Invalid input file format" << endl;
            //exit(1);
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

inline
bool quadratic(const float a, const float b, const float c, float& t1, float& t2)
{
    if (b*b-4*a*c < 0) return false;
    
    t1 = (-b + sqrt(b*b-4*a*c))/(2*a);
    t2 = (-b - sqrt(b*b-4*a*c))/(2*a);
    
    return true;
}

inline
vec3 toVec3(vec4 in)
{
    return vec3(in[0], in[1], in[2]);
}

inline
void print_vec4(vec4 in)
{
    cout << in[0] << " " << in[1] << " " << in[2] << " " << in[3] << endl;
}

inline
float max(float x, float y)
{
    return (x > y) ? x : y;
}

// -------------------------------------------------------------------
// Intersection routine

// TODO: add your ray-sphere intersection routine here.
bool intersect(const Sphere& sphere, const Ray& ray, const string& type, vec3& intersection, vec3& normal, float& t_min)
{
    // 1. calculate inverse model transform
    mat4 model, modelInverse;
    model[0][0] = sphere.scl[0];
    model[1][1] = sphere.scl[1];
    model[2][2] = sphere.scl[2];
    model[3][3] = 1.0f;
    model[0][3] = sphere.pos[0];
    model[1][3] = sphere.pos[1];
    model[2][3] = sphere.pos[2];
    InvertMatrix(model, modelInverse);
    
    // 2. solve quadratic
    Ray inverseRay;
    inverseRay.origin = modelInverse*ray.origin;
    inverseRay.dir    = modelInverse*ray.dir;
    
    vec3 inverseRay_origin = toVec3(inverseRay.origin);
    vec3 inverseRay_dir = toVec3(inverseRay.dir);
    
    float t1, t2;
    float a = dot(inverseRay_dir, inverseRay_dir);
    float b = dot(2*inverseRay_origin, inverseRay_dir);
    float c = dot(inverseRay_origin, inverseRay_origin) - 1.0f;
    
    if (!quadratic(a, b, c, t1, t2)) return false;
    
    float t_h;
    float minimum_dist;
    if (type.compare("object") == 0)
    {
        minimum_dist = 1.0f;
        const float t_smaller = (t1 < t2) ? t1 : t2;
        const float t_larger  = (t1 > t2) ? t1 : t2;
        
        if (t_smaller >= minimum_dist) t_h = t_smaller;
        else if (t_larger >= minimum_dist) t_h = t_larger;
        else return false;
        
    } else if (type.compare("shadow") == 0)
    {
        minimum_dist = 0.0001f;
        const float t_smaller = (t1 < t2) ? t1 : t2;
        const float t_larger  = (t1 > t2) ? t1 : t2;
        
        if (t_smaller >= minimum_dist && t_smaller < 1) t_h = t_smaller;
        else if (t_larger >= minimum_dist && t_larger < 1) t_h = t_larger;
        else return false;
        
    } else
    {
        cout << "Invalid intersection type" << endl;
        return false;
    }
    
    // 3. use t_h result from quadratic in untransformed Ray to find
    //    intersection point
    t_min = t_h;
    intersection = toVec3(ray.origin + t_h*ray.dir);
    
    // calculate normal
    //vec4 unit_normal = inverseRay.origin + t_h*inverseRay.dir - vec4(sphere.pos, 1.0f);
    vec4 unit_normal = modelInverse*(vec4(intersection - sphere.pos, 0.0f));
    normal = toVec3(transpose(modelInverse)*unit_normal);
    
    if (normal[2]*ray.dir[2] > 0) normal *= -1;
    
    return true;
    
}

// -------------------------------------------------------------------
// Ray tracing

vec4 trace(const Ray& ray, const string& type, int count)
{
    // TODO: implement your ray tracing routine here.
    
    // ensure no more than 3 reflected rays cast
    if (count == 3) return vec4(0.0f, 0.0f, 0.0f, 1.0f);
    
    vec3 color = vec3(0.0f, 0.0f, 0.0f);
    vec3 color_local = vec3(0.0f, 0.0f, 0.0f);
    vec3 normal, min_normal, shadow_normal;
    vec3 intersection_point;
    vec3 min_intersection_point;
    Sphere intersected_sphere;
    float intersection_time;
    int num_intersections = 0;
    
    // find closest intersection P of Ray ray
    // call for each sphere, determine closest
    const int num_spheres = spheres.size();
    for (int i=0; i < num_spheres; i++)
    {
        // calculate an intersection point
        float min_intersection_time;
        if (intersect(spheres[i], ray, type, intersection_point, normal, intersection_time))
        {
            if (num_intersections == 0)
            {
                min_intersection_time = intersection_time;
                min_intersection_point = intersection_point;
                min_normal = normal;
                intersected_sphere = spheres[i];
            }
            else if (intersection_time < min_intersection_time)
            {
                min_intersection_time = intersection_time;
                min_intersection_point = intersection_point;
                min_normal = normal;
                intersected_sphere = spheres[i];
            }
    
            ++num_intersections;
        }
    }
    
    if (num_intersections == 0)
        return vec4(background_color.color, 1.0f);
    
    // compute shadow rays, sum contribution from each light source
    // for each light source, intersect shadow ray (from point P towards light source) w/ all objects
    // for each light source...
    //      for each object...
    //          if no intersection, apply local illumination
    //          if in shadow, no contribution from that light source
    // may need to clamp
    const int num_light_sources = light_sources.size();
    Ray L, reflection;
    L.origin = vec4(min_intersection_point, 1.0f);
    reflection.origin = vec4(min_intersection_point, 1.0f);
    min_normal = normalize(min_normal);
    
    for (int i=0; i < num_light_sources; i++)
    {
        num_intersections = 0;
        L.dir = normalize(vec4(light_sources[i].pos - min_intersection_point, 0.0f));
        reflection.dir = normalize(2*vec4(min_normal, 0.0f)*dot(vec4(min_normal, 0.0f), L.dir) - L.dir);
        
        for (int j=0; j < num_spheres; j++)
        {
            
            if (intersect(spheres[i], L, "shadow", intersection_point, shadow_normal, intersection_time))
            {
                //cout << "sphere: " << i << " light: " << j << " intersection: " << intersection_point << endl;
                ++num_intersections;
                //break;
            }
                
        }
        
        // add contribution from local illumination
        if (num_intersections == 0)
        {
            float color_local_r = intersected_sphere.Kd*light_sources[i].intensity[0]*max(dot(min_normal, L.dir),0)*intersected_sphere.color[0] + intersected_sphere.Ks*light_sources[i].intensity[0]*pow(dot(reflection.dir, normalize(-ray.dir)), intersected_sphere.n);
            float color_local_g = intersected_sphere.Kd*light_sources[i].intensity[1]*max(dot(min_normal, L.dir),0)*intersected_sphere.color[1] + intersected_sphere.Ks*light_sources[i].intensity[1]*pow(dot(reflection.dir, normalize(-ray.dir)), intersected_sphere.n);
            float color_local_b = intersected_sphere.Kd*light_sources[i].intensity[2]*max(dot(min_normal, L.dir),0)*intersected_sphere.color[2] + intersected_sphere.Ks*light_sources[i].intensity[2]*pow(dot(reflection.dir, normalize(-ray.dir)), intersected_sphere.n);
            
            color_local = color_local + vec3(color_local_r, color_local_g, color_local_b);

        }

    }
    
    // ambient light
    float ambient_r = intersected_sphere.Ka*ambient_intensity.intensity[0]*intersected_sphere.color[0];
    float ambient_g = intersected_sphere.Ka*ambient_intensity.intensity[1]*intersected_sphere.color[1];
    float ambient_b = intersected_sphere.Ka*ambient_intensity.intensity[2]*intersected_sphere.color[2];
    
    color_local = color_local + vec3(ambient_r, ambient_g, ambient_b);
    
    // add contribution from reflected light
    color = color_local + intersected_sphere.Kr*toVec3(trace(reflection, "shadow", count+1));
    
    // clamp
    if (color[0] > 1) color[0] = 1;
    else if (color[0] < 0) color[0] = 0;
    
    if (color[1] > 1) color[1] = 1;
    else if (color[1] < 0) color[1] = 0;
    
    if (color[2] > 1) color[2] = 1;
    else if (color[2] < 0) color[2] = 0;
    
    // find color contribution from reflected rays
    return vec4(color, 1.0f);
}

vec4 getDir(int ix, int iy)
{
    // TODO: modify this. This should return the direction from the origin
    // to pixel (ix, iy), normalized. DONE
    vec4 dir;
    float alphax = ix/float(g_width);
    float alphay = iy/float(g_height);
    dir = vec4((1-alphax)*g_left+alphax*g_right, (1-alphay)*g_bottom+alphay*g_top, -1.0f, 0.0f);
    return dir;
}

void renderPixel(int ix, int iy)
{
    Ray ray;
    ray.origin = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    ray.dir = getDir(ix, iy);
    vec4 color = trace(ray, "object", 0);
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

void savePPM(int Width, int Height, const char* fname, unsigned char* pixels)
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
                buf[y*g_width*3+x*3+i] = (unsigned char)(((float*)g_colors[y*g_width+x])[i] * 255.0f);
    
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

