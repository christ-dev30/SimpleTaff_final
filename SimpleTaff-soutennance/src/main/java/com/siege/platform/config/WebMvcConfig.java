package com.siege.platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/super-admin").setViewName("forward:/super-admin/index.html");
        registry.addViewController("/super-admin/").setViewName("forward:/super-admin/index.html");
        
        registry.addViewController("/admin-entreprise").setViewName("forward:/admin-entreprise/index.html");
        registry.addViewController("/admin-entreprise/").setViewName("forward:/admin-entreprise/index.html");
        
        registry.addViewController("/employeur").setViewName("forward:/employeur/index.html");
        registry.addViewController("/employeur/").setViewName("forward:/employeur/index.html");
        
        registry.addViewController("/vitrine").setViewName("forward:/vitrine/index.html");
        registry.addViewController("/vitrine/").setViewName("forward:/vitrine/index.html");
        
        registry.addViewController("/coordonnateur").setViewName("forward:/coordonnateur/index.html");
        registry.addViewController("/coordonnateur/").setViewName("forward:/coordonnateur/index.html");
    }

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(org.springframework.http.CacheControl.noCache().mustRevalidate());

        java.io.File uploadDir = new java.io.File("uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String absolutePath = uploadDir.toURI().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath, "file:uploads/", "file:./uploads/");
    }
}
